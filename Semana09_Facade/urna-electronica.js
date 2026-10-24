/**
 * FACADE — Subsistema: urna electronica.
 *
 * Deposita el voto en la mesa correcta de la jerarquia (Composite) y deja
 * el rastro de auditoria SIN identidad: solo un id anonimo y la mesa.
 * Los nombres de mesa deben ser unicos dentro de la jerarquia.
 */
const crypto = require('crypto');
const { LoggerCentralizado } = require('../Semana03/singleton-votacion');

class UrnaElectronica {
  constructor(raiz) {
    if (!raiz) throw new Error('La urna requiere la raiz de la jerarquia electoral');
    this.raiz = raiz;
  }

  depositar(candidato, nombreMesa) {
    const mesa = this.raiz.buscarMesa(nombreMesa);
    if (!mesa) throw new Error(`La mesa "${nombreMesa}" no existe`);

    mesa.registrarVoto(candidato); // lanza si la mesa esta cerrada

    const idVotoAnonimo = crypto.randomUUID();
    LoggerCentralizado.obtenerInstancia().registrarVoto(idVotoAnonimo, nombreMesa);
    return idVotoAnonimo;
  }

  cerrarMesa(nombreMesa) {
    const mesa = this.raiz.buscarMesa(nombreMesa);
    if (!mesa) throw new Error(`La mesa "${nombreMesa}" no existe`);
    mesa.cerrar();
  }

  getTotalVotos() { return this.raiz.getTotalVotos(); }

  todasCerradas() { return this.raiz.todasCerradas(); }
}

module.exports = { UrnaElectronica };
