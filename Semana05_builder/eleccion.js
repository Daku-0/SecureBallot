/**
 * BUILDER — Producto.
 *
 * Representa una Elección ya construida. No sabe nada sobre CÓMO se
 * construyó paso a paso — esa responsabilidad vive en el Builder.
 */
class Eleccion {
  constructor() {
    this.nombre = null;
    this.candidatos = [];
    this.mesas = [];
    this.fechaApertura = null;
    this.fechaCierre = null;
    this.permiteVotoBlanco = false;
    this.umbralQuorum = 0;
  }
}

module.exports = { Eleccion };