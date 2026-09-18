/**
 * ABSTRACT FACTORY — Familia concreta: canal PRESENCIAL / ASISTIDO.
 *
 * El votante está físicamente en un punto de votación y un encargado lo
 * orienta en el uso del sistema, pero el voto se emite electrónicamente
 * igual que en el canal virtual. No hay papel en ningún paso.
 */
const { FabricaCanalVotacion } = require('./fabrica-canal-votacion');
const { Autenticador, ValidadorDeVoto, EmisorDeComprobante } = require('./componentes-votacion');

class AutenticadorPresencial extends Autenticador {
  autenticar(datosVotante) {
    // La identidad se confirma con apoyo del encargado en el punto de
    // votación (ej. contra un documento físico), no con un OTP digital.
    const autenticado = Boolean(
      datosVotante?.identificacion && datosVotante?.verificadoPorEncargado
    );
    return { autenticado, canal: 'presencial', metodo: 'verificacion_asistida' };
  }
}

class ValidadorDeVotoPresencial extends ValidadorDeVoto {
  validar(datosVoto) {
    // En este canal el voto queda asociado a la mesa del punto de
    // votación donde el encargado atendió al votante.
    const valido = Boolean(datosVoto?.candidato && datosVoto?.mesa);
    return {
      valido,
      canal: 'presencial',
      motivo: valido ? undefined : 'falta candidato o mesa asignada',
    };
  }
}

class EmisorDeComprobantePresencial extends EmisorDeComprobante {
  emitir(datosVoto) {
    // Comprobante digital mostrado/entregado en el punto de votación
    // (pantalla o envío electrónico), nunca impreso en papel.
    return {
      formato: 'digital',
      canal: 'presencial',
      contenido: `Comprobante electrónico — Punto de votación asistido (mesa ${datosVoto.mesa}), candidato: ${datosVoto.candidato}`,
    };
  }
}

class FabricaVotacionPresencial extends FabricaCanalVotacion {
  crearAutenticador() {
    return new AutenticadorPresencial();
  }

  crearValidadorDeVoto() {
    return new ValidadorDeVotoPresencial();
  }

  crearEmisorDeComprobante() {
    return new EmisorDeComprobantePresencial();
  }
}

module.exports = {
  AutenticadorPresencial,
  ValidadorDeVotoPresencial,
  EmisorDeComprobantePresencial,
  FabricaVotacionPresencial,
};
