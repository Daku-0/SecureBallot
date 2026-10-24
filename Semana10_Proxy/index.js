const { ServicioResultados } = require('./servicio-resultados');
const { ServicioResultadosReal } = require('./servicio-resultados-real');
const { ProxyVirtualResultados } = require('./proxy-virtual');
const { ProxyCacheResultados } = require('./proxy-cache');
const { ProxyProteccionResultados } = require('./proxy-proteccion');
const { ErrorAccesoResultados } = require('./errores');
const { crearServicioResultados } = require('./crear-servicio-resultados');

module.exports = {
  ServicioResultados, ServicioResultadosReal,
  ProxyVirtualResultados, ProxyCacheResultados, ProxyProteccionResultados,
  ErrorAccesoResultados, crearServicioResultados,
};
