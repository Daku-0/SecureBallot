/**
 * PROXY — Caching Proxy.
 *
 * Guarda el resultado para no recalcularlo. El riesgo clasico del cache es
 * servir datos obsoletos, y en una eleccion en curso el conteo cambia con
 * cada voto; por eso solo guarda cuando `puedeCachear()` es true (en
 * SecureBallot: cuando todas las mesas estan cerradas y el resultado ya
 * no puede cambiar).
 */
const { ServicioResultados } = require('./servicio-resultados');

class ProxyCacheResultados extends ServicioResultados {
  #resultado = null;

  constructor(servicio, { puedeCachear = () => true } = {}) {
    super();
    this.servicio = servicio;
    this.puedeCachear = puedeCachear;
  }

  consultar() {
    if (this.#resultado) return this.#resultado;
    const resultado = this.servicio.consultar();
    if (this.puedeCachear()) this.#resultado = resultado;
    return resultado;
  }

  invalidar() { this.#resultado = null; }
}

module.exports = { ProxyCacheResultados };
