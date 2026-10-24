/**
 * FLYWEIGHT — el objeto compartido.
 *
 * Guarda SOLO el estado INTRINSECO (identico para todos los tarjetones):
 * codigo, nombre, partido y propuesta. Es inmutable: si se pudiera
 * modificar, el cambio se veria en todas las mesas a la vez.
 *
 * El estado EXTRINSECO (posicion en el tarjeton y mesa) NO se guarda aqui;
 * llega como parametro en cada llamada.
 */
class Candidato {
  constructor({ codigo, nombre, partido, propuesta }) {
    this.codigo = codigo;
    this.nombre = nombre;
    this.partido = partido;
    this.propuesta = propuesta;
    Object.freeze(this);
  }

  // [INGREDIENTE 1] el estado extrinseco se pasa por parametro
  mostrar(posicion, mesa) {
    return `[${mesa}] ${posicion}. ${this.nombre} (${this.partido}) - Cod. ${this.codigo}`;
  }
}

module.exports = { Candidato };
