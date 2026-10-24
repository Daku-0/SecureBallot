/**
 * Codigos de un solo uso para el voto virtual. El codigo esperado vive SOLO
 * en el servidor: el cliente unicamente envia el que digito el votante.
 * Vencen a los 5 minutos y se invalidan tras 5 intentos fallidos.
 */
const crypto = require('crypto');

class AlmacenOtp {
  #codigos = new Map();

  constructor({ ttlMs = 5 * 60 * 1000, maxIntentos = 5, ahora = () => Date.now() } = {}) {
    this.ttlMs = ttlMs;
    this.maxIntentos = maxIntentos;
    this.ahora = ahora;
  }

  emitir(documento) {
    const codigo = String(crypto.randomInt(100000, 1000000));
    this.#codigos.set(documento, { codigo, expira: this.ahora() + this.ttlMs, intentos: 0 });
    return codigo;
  }

  esperado(documento) {
    const entrada = this.#codigos.get(documento);
    if (!entrada) return null;
    if (this.ahora() > entrada.expira) { this.#codigos.delete(documento); return null; }
    return entrada.codigo;
  }

  registrarFallo(documento) {
    const entrada = this.#codigos.get(documento);
    if (!entrada) return;
    entrada.intentos += 1;
    if (entrada.intentos >= this.maxIntentos) this.#codigos.delete(documento);
  }

  consumir(documento) { this.#codigos.delete(documento); }
}

module.exports = { AlmacenOtp };
