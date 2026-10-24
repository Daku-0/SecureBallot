/**
 * Error de acceso denegado a los resultados (equivalente al SecurityException
 * del material de clase). `codigo` permite distinguir el motivo sin parsear texto.
 */
class ErrorAccesoResultados extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorAccesoResultados';
    this.codigo = codigo; // 'ROL_NO_AUTORIZADO' | 'ELECCION_ABIERTA'
  }
}

module.exports = { ErrorAccesoResultados };
