/**
 * ADAPTER — el Adapter en sí (variante de objeto / por composición,
 * la preferida en JS igual que en Java según el material del profe).
 *
 * Envuelve una instancia de ServicioPadronExterno (Adaptee) y
 * TRADUCE sus llamadas a la interfaz que espera VerificadorIdentidad
 * (Target). Además, cada verificación queda registrada en el mismo
 * mecanismo de auditoría del Singleton (LoggerCentralizado), igual
 * que ya ocurre con Factory Method y Bridge.
 */
const { VerificadorIdentidad } = require('./verificador-identidad');
const { LoggerCentralizado } = require('../Semana03/singleton-votacion');

class VerificadorIdentidadAdapter extends VerificadorIdentidad {
  constructor(servicioExterno) {
    super();
    // [INGREDIENTE 2] ADAPTEE: el objeto externo que se envuelve
    this.servicioExterno = servicioExterno;
  }

  // [INGREDIENTE 3] ADAPTER: traduce la llamada de un lado al otro
  verificar(documento) {
    const respuesta = this.servicioExterno.consultarCedula(documento);

    const resultado = respuesta.status !== 'OK'
      ? { valido: false, nombreCompleto: null }
      : { valido: respuesta.data.habilitado === true, nombreCompleto: respuesta.data.nombreCompleto };

    LoggerCentralizado.obtenerInstancia().registrar(
      'INFO',
      'Verificacion de identidad de votante',
      { documento, valido: resultado.valido }
    );

    return resultado;
  }
}

module.exports = { VerificadorIdentidadAdapter };