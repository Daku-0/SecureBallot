/**
 * FACADE — Subsistema: control de doble voto.
 *
 * Guarda UNICAMENTE una huella (SHA-256 con sal aleatoria) de quien ya
 * voto. No guarda el documento en claro ni, sobre todo, a quien voto:
 * "ya voto" y "por quien voto" quedan en lugares completamente separados.
 *
 * Nota: vive en memoria; en produccion deberia persistirse para resistir reinicios.
 */
const crypto = require('crypto');

class RegistroVotantes {
  #sal = crypto.randomBytes(16);
  #huellas = new Set();

  #huellaDe(documento) {
    return crypto.createHash('sha256').update(this.#sal).update(String(documento)).digest('hex');
  }

  yaVoto(documento) { return this.#huellas.has(this.#huellaDe(documento)); }

  marcarComoVotado(documento) { this.#huellas.add(this.#huellaDe(documento)); }
}

module.exports = { RegistroVotantes };
