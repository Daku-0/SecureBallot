/**
 * COMPOSITE — Leaf.
 *
 * Una mesa de votacion: el unico nodo que realmente guarda votos.
 * Solo cuenta por candidato; NUNCA guarda quien voto, para no
 * comprometer el secreto del voto.
 */
const { ElementoElectoral } = require('./elemento-electoral');

const VOTO_BLANCO = 'VOTO_BLANCO';

class MesaVotacion extends ElementoElectoral {
  #votos = new Map();
  #cerrada = false;

  registrarVoto(candidato) {
    if (this.#cerrada) throw new Error(`La mesa "${this.nombre}" esta cerrada`);
    if (!candidato) throw new Error('El voto requiere un candidato (o VOTO_BLANCO)');
    this.#votos.set(candidato, (this.#votos.get(candidato) || 0) + 1);
  }

  cerrar() { this.#cerrada = true; }

  estaCerrada() { return this.#cerrada; }

  getTotalVotos() {
    let total = 0;
    for (const n of this.#votos.values()) total += n;
    return total;
  }

  getTotalMesas() { return 1; }

  getResultados() { return Object.fromEntries(this.#votos); }

  todasCerradas() { return this.#cerrada; }

  buscarMesa(nombre) { return this.nombre === nombre ? this : null; }

  mostrar(indentacion = '') {
    const estado = this.#cerrada ? 'cerrada' : 'abierta';
    return `${indentacion}- Mesa: ${this.nombre} (${this.getTotalVotos()} votos, ${estado})`;
  }
}

module.exports = { MesaVotacion, VOTO_BLANCO };
