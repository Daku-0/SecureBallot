/**
 * Resultado simple de una operacion de la fachada: evita que el cliente
 * tenga que interpretar excepciones de cada subsistema.
 */
class Resultado {
  constructor(exito, mensaje, datos = {}) {
    this.exito = exito;
    this.mensaje = mensaje;
    this.datos = datos;
  }
  static exito(mensaje, datos) { return new Resultado(true, mensaje, datos); }
  static error(mensaje) { return new Resultado(false, mensaje); }
}

module.exports = { Resultado };
