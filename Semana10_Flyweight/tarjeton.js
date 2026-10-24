/**
 * FLYWEIGHT — Cliente (contexto con estado extrinseco).
 *
 * Un tarjeton por mesa. Cada opcion guarda una REFERENCIA al candidato
 * compartido mas lo unico que es propio de esa mesa: la posicion.
 */
class OpcionTarjeton {
  constructor(candidato, posicion) {
    this.candidato = candidato; // referencia al flyweight (compartido)
    this.posicion = posicion;   // estado extrinseco (unico por opcion)
  }
}

class Tarjeton {
  constructor(mesa, codigosCandidatos, fabrica) {
    if (!mesa) throw new Error('El tarjeton requiere una mesa');
    if (!Array.isArray(codigosCandidatos) || codigosCandidatos.length === 0) {
      throw new Error('El tarjeton requiere al menos un candidato');
    }
    if (new Set(codigosCandidatos).size !== codigosCandidatos.length) {
      throw new Error('Un candidato no puede aparecer dos veces en el mismo tarjeton');
    }
    this.mesa = mesa;
    this.opciones = codigosCandidatos.map((codigo, i) => new OpcionTarjeton(fabrica.getCandidato(codigo), i + 1));
  }

  mostrar() {
    return this.opciones.map((o) => o.candidato.mostrar(o.posicion, this.mesa)).join('\n');
  }
}

module.exports = { Tarjeton, OpcionTarjeton };
