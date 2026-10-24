/**
 * COMPOSITE — Composite.
 *
 * Una division territorial (pais, departamento, municipio, puesto).
 * Contiene hijos que pueden ser mesas u otras unidades, y delega
 * recursivamente cada operacion en ellos. Programa/Facultad/Curso
 * eran identicos en estructura en el material de clase; aqui una sola
 * clase con `nivel` cubre todos los niveles territoriales.
 *
 * Reglas de integridad propias del dominio electoral:
 *  - Un nodo no puede tener dos padres (se contarian sus votos dos veces).
 *  - No se admiten ciclos (una unidad dentro de si misma o de un descendiente).
 */
const { ElementoElectoral } = require('./elemento-electoral');
const { LoggerCentralizado } = require('../Semana03/singleton-votacion');

class UnidadElectoral extends ElementoElectoral {
  #hijos = [];

  constructor(nombre, nivel = 'Unidad') {
    super(nombre);
    this.nivel = nivel;
  }

  agregar(elemento) {
    if (!(elemento instanceof ElementoElectoral)) {
      throw new Error('Solo se pueden agregar elementos electorales');
    }
    if (this.#esElementoOAncestro(elemento)) {
      throw new Error(`Ciclo no permitido: "${elemento.nombre}" es ancestro de "${this.nombre}" o el mismo nodo`);
    }
    if (elemento.padre) {
      throw new Error(`"${elemento.nombre}" ya pertenece a "${elemento.padre.nombre}": sus votos se contarian dos veces`);
    }

    this.#hijos.push(elemento);
    elemento._asignarPadre(this);

    LoggerCentralizado.obtenerInstancia().registrar(
      'INFO',
      'Elemento agregado a la jerarquia electoral',
      { padre: this.nombre, hijo: elemento.nombre }
    );
    return this; // permite encadenar
  }

  eliminar(elemento) {
    const i = this.#hijos.indexOf(elemento);
    if (i === -1) return false;
    this.#hijos.splice(i, 1);
    elemento._asignarPadre(null);
    return true;
  }

  // Recorre hacia arriba desde este nodo: true si `elemento` es este nodo o uno de sus ancestros
  #esElementoOAncestro(elemento) {
    for (let n = this; n; n = n.padre) {
      if (n === elemento) return true;
    }
    return false;
  }

  getTotalVotos() {
    return this.#hijos.reduce((suma, h) => suma + h.getTotalVotos(), 0);
  }

  getTotalMesas() {
    return this.#hijos.reduce((suma, h) => suma + h.getTotalMesas(), 0);
  }

  getResultados() {
    const consolidado = {};
    for (const hijo of this.#hijos) {
      for (const [candidato, votos] of Object.entries(hijo.getResultados())) {
        consolidado[candidato] = (consolidado[candidato] || 0) + votos;
      }
    }
    return consolidado;
  }

  // Una unidad sin mesas NO esta "cerrada": no hay nada que publicar todavia.
  todasCerradas() {
    return this.#hijos.length > 0 && this.#hijos.every((h) => h.todasCerradas());
  }

  buscarMesa(nombre) {
    for (const hijo of this.#hijos) {
      const encontrada = hijo.buscarMesa(nombre);
      if (encontrada) return encontrada;
    }
    return null;
  }

  mostrar(indentacion = '') {
    const lineas = [`${indentacion}+ ${this.nivel}: ${this.nombre} (${this.getTotalVotos()} votos)`];
    for (const hijo of this.#hijos) lineas.push(hijo.mostrar(indentacion + '  '));
    return lineas.join('\n');
  }
}

module.exports = { UnidadElectoral };
