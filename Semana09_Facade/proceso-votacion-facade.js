/**
 * FACADE — la fachada en si.
 *
 * Un unico punto de entrada para el proceso de votacion. Por dentro
 * orquesta SIN implementar logica de negocio propia:
 *   - VerificadorIdentidad  (Adapter, Semana 7)  -> esta en el padron?
 *   - FabricaCanalVotacion  (Abstract Factory)   -> autenticar / validar / comprobante
 *   - RegistroVotantes      (subsistema)         -> ya voto?
 *   - UrnaElectronica       (subsistema + Composite) -> depositar el voto
 *   - NotificacionResultadoPublicado (Bridge, Semana 7) -> avisar resultados
 *
 * Todas las dependencias entran por el constructor (DIP): la fachada no
 * sabe si el verificador es el padron real o un doble de prueba, ni si el
 * canal es presencial o virtual.
 */
const { Resultado } = require('./resultado');
const { RegistroVotantes } = require('./registro-votantes');
const { NotificacionResultadoPublicado } = require('../Semana07_Bridge/tipos-notificacion');
const { LoggerCentralizado } = require('../Semana03/singleton-votacion');

class ProcesoVotacionFacade {
  constructor({ verificador, fabricaCanal, urna, registroVotantes = new RegistroVotantes() }) {
    if (!verificador || !fabricaCanal || !urna) {
      throw new Error('La fachada requiere verificador, fabricaCanal y urna');
    }
    this.verificador = verificador;
    this.urna = urna;
    this.registroVotantes = registroVotantes;
    // Los tres componentes del canal pertenecen a la misma familia (Abstract Factory)
    this.autenticador = fabricaCanal.crearAutenticador();
    this.validador = fabricaCanal.crearValidadorDeVoto();
    this.emisor = fabricaCanal.crearEmisorDeComprobante();
  }

  /**
   * @param {{documento:string, datosVotante:object, candidato:string, mesa:string, dispositivoId?:string}} solicitud
   *  En el canal virtual `mesa` es el nombre de la urna virtual dentro de la jerarquia.
   */
  emitirVoto({ documento, datosVotante, candidato, mesa, dispositivoId }) {
    // 1. Identidad en el padron (Adapter)
    const identidad = this.verificador.verificar(documento);
    if (!identidad.valido) return this.#rechazar('identidad', 'El documento no esta habilitado en el padron');

    // 2. Autenticacion segun el canal (Abstract Factory)
    const auth = this.autenticador.autenticar(datosVotante);
    if (!auth.autenticado) return this.#rechazar('autenticacion', `Autenticacion fallida (${auth.metodo})`);

    // 3. Un voto por persona
    if (this.registroVotantes.yaVoto(documento)) return this.#rechazar('doble_voto', 'El votante ya emitio su voto');

    // 4. Validacion del voto segun el canal (Abstract Factory)
    const datosVoto = { candidato, mesa, dispositivoId };
    const validacion = this.validador.validar(datosVoto);
    if (!validacion.valido) return this.#rechazar('validacion', `Voto invalido: ${validacion.motivo}`);

    // 5. Depositar en la urna. Si falla (mesa cerrada o inexistente) el votante
    //    NO queda marcado como "ya voto": puede votar en una mesa abierta.
    let idVotoAnonimo;
    try {
      idVotoAnonimo = this.urna.depositar(candidato, mesa);
    } catch (error) {
      return this.#rechazar('urna', error.message);
    }

    // 6. Solo ahora se marca como votado
    this.registroVotantes.marcarComoVotado(documento);

    // 7. Comprobante electronico segun el canal (Abstract Factory)
    const comprobante = this.emisor.emitir(datosVoto);
    return Resultado.exito('Voto registrado', { comprobante, idVotoAnonimo });
  }

  cerrarMesa(nombreMesa) {
    try {
      this.urna.cerrarMesa(nombreMesa);
      return Resultado.exito(`Mesa "${nombreMesa}" cerrada`);
    } catch (error) {
      return Resultado.error(error.message);
    }
  }

  /** Publica el total solo cuando TODAS las mesas estan cerradas, y avisa por el canal elegido (Bridge). */
  publicarResultados({ nombreEleccion, destinatario, canalEnvio }) {
    if (!this.urna.todasCerradas()) {
      return Resultado.error('No se pueden publicar resultados mientras haya mesas abiertas');
    }
    const aviso = new NotificacionResultadoPublicado(canalEnvio)
      .enviar(destinatario, { nombreEleccion, totalVotos: this.urna.getTotalVotos() });
    return Resultado.exito('Resultados publicados', { aviso });
  }

  // El rechazo queda auditado, pero SIN documento ni candidato: solo la etapa donde fallo.
  #rechazar(etapa, mensaje) {
    LoggerCentralizado.obtenerInstancia().registrar('WARN', 'Voto rechazado', { etapa });
    return Resultado.error(mensaje);
  }
}

module.exports = { ProcesoVotacionFacade };
