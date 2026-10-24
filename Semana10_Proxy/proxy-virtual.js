/**
 * PROXY — Virtual Proxy.
 *
 * Crea el servicio real SOLO cuando se necesita por primera vez. A
 * diferencia del ejemplo del material (que instancia el real en el
 * constructor), aqui la creacion es realmente diferida.
 */
const { ServicioResultados } = require('./servicio-resultados');

class ProxyVirtualResultados extends ServicioResultados {
  #real = null;

  constructor(crearReal) {
    super();
    if (typeof crearReal !== 'function') throw new Error('Se requiere una funcion que cree el servicio real');
    this.crearReal = crearReal;
  }

  estaCreado() { return this.#real !== null; }

  consultar() {
    if (!this.#real) this.#real = this.crearReal();
    return this.#real.consultar();
  }
}

module.exports = { ProxyVirtualResultados };
