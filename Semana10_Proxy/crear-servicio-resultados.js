/**
 * Compone la cadena de proxies. Todos cumplen ServicioResultados, asi que
 * se apilan sin que el cliente lo note:
 *
 *   Proteccion -> Cache -> Virtual -> Real
 *
 * Proteccion va primero (deniega antes de hacer cualquier trabajo); Cache
 * antes de Virtual (un acierto de cache ni siquiera toca al servicio real).
 */
const { ServicioResultadosReal } = require('./servicio-resultados-real');
const { ProxyVirtualResultados } = require('./proxy-virtual');
const { ProxyCacheResultados } = require('./proxy-cache');
const { ProxyProteccionResultados } = require('./proxy-proteccion');

function crearServicioResultados({ raiz, usuario, rol, rolesPermitidos }) {
  const virtual = new ProxyVirtualResultados(() => new ServicioResultadosReal(raiz));
  const cache = new ProxyCacheResultados(virtual, { puedeCachear: () => raiz.todasCerradas() });
  return new ProxyProteccionResultados(cache, { usuario, rol }, {
    eleccionCerrada: () => raiz.todasCerradas(),
    rolesPermitidos,
  });
}

module.exports = { crearServicioResultados };
