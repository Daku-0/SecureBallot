/**
 * BUILDER — Builder abstracto y Concrete Builder.
 *
 * El Builder abstracto declara los pasos posibles de construcción.
 * El Concrete Builder los implementa y va armando una instancia real
 * de Eleccion internamente, pieza por pieza.
 */
const { Eleccion } = require('./eleccion');

// [INGREDIENTE] BUILDER (abstracto)
class EleccionBuilder {
  definirNombre(nombre) { throw new Error('definirNombre() debe implementarse'); }
  agregarCandidato(candidato) { throw new Error('agregarCandidato() debe implementarse'); }
  agregarMesa(mesa) { throw new Error('agregarMesa() debe implementarse'); }
  definirFechas(apertura, cierre) { throw new Error('definirFechas() debe implementarse'); }
  permitirVotoBlanco(permite) { throw new Error('permitirVotoBlanco() debe implementarse'); }
  definirQuorum(umbral) { throw new Error('definirQuorum() debe implementarse'); }
  obtenerEleccion() { throw new Error('obtenerEleccion() debe implementarse'); }
}

// [INGREDIENTE] CONCRETE BUILDER
class EleccionBuilderEstandar extends EleccionBuilder {
  constructor() {
    super();
    this.eleccion = new Eleccion();
  }

  definirNombre(nombre) {
    this.eleccion.nombre = nombre;
    return this;
  }

  agregarCandidato(candidato) {
    this.eleccion.candidatos.push(candidato);
    return this;
  } //

  agregarMesa(mesa) {
    this.eleccion.mesas.push(mesa);
    return this;
  }

  definirFechas(apertura, cierre) {
    this.eleccion.fechaApertura = apertura;
    this.eleccion.fechaCierre = cierre;
    return this;
  }

  permitirVotoBlanco(permite) {
    this.eleccion.permiteVotoBlanco = permite;
    return this;
  }

  definirQuorum(umbral) {
    this.eleccion.umbralQuorum = umbral;
    return this;
  }

  obtenerEleccion() {
    return this.eleccion;
  }
}

module.exports = { EleccionBuilder, EleccionBuilderEstandar };