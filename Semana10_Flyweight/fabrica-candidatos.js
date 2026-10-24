/**
 * FLYWEIGHT — Flyweight Factory.
 *
 * Entrega siempre la MISMA instancia de Candidato para un mismo codigo.
 * Solo consulta el origen de datos (BD, API del padron de candidatos...)
 * la primera vez que se pide un codigo.
 *
 * Es una instancia (no un static) para poder probarla de forma aislada;
 * en la aplicacion se crea una sola, como sugiere el material de clase
 * cuando relaciona Flyweight con Singleton.
 */
const { Candidato } = require('./candidato');
const { LoggerCentralizado } = require('../Semana03/singleton-votacion');

class FabricaCandidatos {
  #cache = new Map();

  /** @param {(codigo:string) => object|null} origenDatos */
  constructor(origenDatos) {
    if (typeof origenDatos !== 'function') throw new Error('La fabrica requiere una funcion origenDatos(codigo)');
    this.origenDatos = origenDatos;
  }

  getCandidato(codigo) {
    // [INGREDIENTE 2] si ya existe en el cache se devuelve la misma instancia
    const existente = this.#cache.get(codigo);
    if (existente) return existente;

    const datos = this.origenDatos(codigo);
    if (!datos) throw new Error(`Candidato "${codigo}" no existe en el origen de datos`);

    const candidato = new Candidato({ ...datos, codigo });
    this.#cache.set(codigo, candidato);

    LoggerCentralizado.obtenerInstancia().registrar(
      'INFO',
      'Flyweight de candidato creado',
      { codigo }
    );
    return candidato;
  }

  getTotalInstancias() { return this.#cache.size; }
}

module.exports = { FabricaCandidatos };
