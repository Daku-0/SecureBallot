/**
 * PROXY — Protection Proxy (+ registro de auditoria de cada intento).
 *
 * Decide si una consulta puede pasar ANTES de tocar el servicio real:
 *   1. el rol debe estar autorizado
 *   2. la eleccion debe estar cerrada (no se divulgan conteos parciales)
 * Se comprueba primero el rol para no revelar el estado de la eleccion a
 * quien no tiene derecho a consultarla. Todo intento, permitido o
 * denegado, queda en el LoggerCentralizado.
 */
const { ServicioResultados } = require('./servicio-resultados');
const { ErrorAccesoResultados } = require('./errores');
const { LoggerCentralizado } = require('../Semana03/singleton-votacion');

const ROLES_POR_DEFECTO = ['AUDITOR', 'ADMIN_ELECTORAL'];

class ProxyProteccionResultados extends ServicioResultados {
  constructor(servicio, { usuario, rol }, { eleccionCerrada, rolesPermitidos = ROLES_POR_DEFECTO } = {}) {
    super();
    if (typeof eleccionCerrada !== 'function') throw new Error('Se requiere eleccionCerrada() para proteger los resultados');
    this.servicio = servicio;
    this.usuario = usuario;
    this.rol = rol;
    this.eleccionCerrada = eleccionCerrada;
    this.rolesPermitidos = rolesPermitidos;
  }

  consultar() {
    if (!this.rolesPermitidos.includes(this.rol)) {
      return this.#denegar('ROL_NO_AUTORIZADO', `El rol ${this.rol} no puede consultar resultados`);
    }
    if (!this.eleccionCerrada()) {
      return this.#denegar('ELECCION_ABIERTA', 'Los resultados no estan disponibles mientras la eleccion siga abierta');
    }
    LoggerCentralizado.obtenerInstancia().registrar(
      'INFO', 'Consulta de resultados autorizada', { usuario: this.usuario, rol: this.rol }
    );
    return this.servicio.consultar();
  }

  #denegar(codigo, mensaje) {
    LoggerCentralizado.obtenerInstancia().registrar(
      'WARN', 'Consulta de resultados denegada', { usuario: this.usuario, rol: this.rol, motivo: codigo }
    );
    throw new ErrorAccesoResultados(codigo, mensaje);
  }
}

module.exports = { ProxyProteccionResultados };
