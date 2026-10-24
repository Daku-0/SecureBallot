/**
 * Identidad SIMULADA para la demostracion: el rol llega en cabeceras.
 * NO es autenticacion real; en produccion deberia ser una sesion o un token
 * firmado verificado en el servidor.
 */
const { HttpError } = require('./http-utils');

const ROLES = ['VOTANTE', 'JURADO', 'AUDITOR', 'ADMIN_ELECTORAL'];

function leerIdentidad(req) {
  const rol = req.headers['x-rol'] || 'VOTANTE';
  if (!ROLES.includes(rol)) throw new HttpError(400, `Rol desconocido: ${String(rol).slice(0, 30)}`, 'ROL_INVALIDO');
  const usuario = String(req.headers['x-usuario'] || 'anonimo')
    .replace(/[^\p{L}\p{N} ._@-]/gu, '')
    .slice(0, 40) || 'anonimo';
  return { usuario, rol };
}

function exigirRol(identidad, permitidos, accion) {
  if (!permitidos.includes(identidad.rol)) {
    throw new HttpError(403, `El rol ${identidad.rol} no puede ${accion}`, 'ROL_NO_AUTORIZADO');
  }
}

module.exports = { ROLES, leerIdentidad, exigirRol };
