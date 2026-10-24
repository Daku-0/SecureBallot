/**
 * RAIZ DE COMPOSICION: aqui, y solo aqui, se arman los patrones de las
 * semanas 3 a 10 para formar una eleccion de demostracion.
 */
require('./config-entorno');

const { UnidadElectoral, MesaVotacion } = require('../Semana08_Composite');
const { ProcesoVotacionFacade, UrnaElectronica, RegistroVotantes } = require('../Semana09_Facade');
const { FabricaCandidatos, Tarjeton } = require('../Semana10_Flyweight');
const {
  ServicioResultadosReal, ProxyVirtualResultados, ProxyCacheResultados, ProxyProteccionResultados,
} = require('../Semana10_Proxy');
const { VerificadorIdentidadAdapter, ServicioPadronExterno } = require('../Semana07_Adapter');
const { FabricaVotacionPresencial } = require('../Semana04_Abstract_Factory/canal-presencial');
const { FabricaVotacionVirtual } = require('../Semana04_Abstract_Factory/canal-virtual');
const { AlmacenOtp } = require('./almacen-otp');

const URNA_VIRTUAL = 'URNA-VIRTUAL';

const CATALOGO = {
  C1: { nombre: 'Ana Pérez', partido: 'Partido Verde', propuesta: 'Movilidad sostenible y educación pública.' },
  C2: { nombre: 'Luis Gómez', partido: 'Partido Azul', propuesta: 'Salud primaria y empleo juvenil.' },
  C3: { nombre: 'Carla Ríos', partido: 'Partido Rojo', propuesta: 'Seguridad ciudadana y espacio público.' },
};
const CODIGOS_TARJETON = ['C1', 'C2', 'C3'];

const ESTRUCTURA = {
  nombre: 'Colombia', nivel: 'Nacional', hijos: [
    { nombre: 'Santander', nivel: 'Departamento', hijos: [
      { nombre: 'Bucaramanga', nivel: 'Municipio', hijos: [
        { nombre: 'Puesto Centro', nivel: 'Puesto', hijos: [{ mesa: 'Mesa 1' }, { mesa: 'Mesa 2' }] },
        { nombre: 'Puesto Norte', nivel: 'Puesto', hijos: [{ mesa: 'Mesa 3' }] },
      ] },
      { nombre: 'Floridablanca', nivel: 'Municipio', hijos: [
        { nombre: 'Puesto Cañaveral', nivel: 'Puesto', hijos: [{ mesa: 'Mesa 4' }] },
      ] },
    ] },
    { nombre: 'Voto virtual', nivel: 'Canal', hijos: [{ mesa: URNA_VIRTUAL }] },
  ],
};

function construirArbol(spec) {
  if (spec.mesa) return new MesaVotacion(spec.mesa);
  const unidad = new UnidadElectoral(spec.nombre, spec.nivel);
  spec.hijos.forEach((hijo) => unidad.agregar(construirArbol(hijo)));
  return unidad;
}

function nombresDeMesas(spec) {
  if (spec.mesa) return [spec.mesa];
  return spec.hijos.flatMap(nombresDeMesas);
}

function crearEleccion() {
  const raiz = construirArbol(ESTRUCTURA);
  const urna = new UrnaElectronica(raiz);
  const registroVotantes = new RegistroVotantes(); // compartido: un voto por persona en AMBOS canales
  const verificador = new VerificadorIdentidadAdapter(new ServicioPadronExterno());

  const fachadas = {
    presencial: new ProcesoVotacionFacade({ verificador, fabricaCanal: new FabricaVotacionPresencial(), urna, registroVotantes }),
    virtual: new ProcesoVotacionFacade({ verificador, fabricaCanal: new FabricaVotacionVirtual(), urna, registroVotantes }),
  };

  const fabricaCandidatos = new FabricaCandidatos((codigo) => CATALOGO[codigo] || null);

  // Cadena compartida Cache -> Virtual -> Real; la proteccion se crea por solicitud (cada una con su usuario y rol)
  const cadenaCompartida = new ProxyCacheResultados(
    new ProxyVirtualResultados(() => new ServicioResultadosReal(raiz)),
    { puedeCachear: () => raiz.todasCerradas() }
  );
  const servicioResultadosPara = ({ usuario, rol }) =>
    new ProxyProteccionResultados(cadenaCompartida, { usuario, rol }, { eleccionCerrada: () => raiz.todasCerradas() });

  return {
    nombre: 'Elección de demostración 2026',
    raiz,
    estructura: ESTRUCTURA,
    mesas: nombresDeMesas(ESTRUCTURA),
    fachadas,
    fabricaCandidatos,
    servicioResultadosPara,
    almacenOtp: new AlmacenOtp(),
  };
}

function tarjetonDe(estado, nombreMesa) {
  return new Tarjeton(nombreMesa, CODIGOS_TARJETON, estado.fabricaCandidatos);
}

function serializarArbol(spec, raiz) {
  if (spec.mesa) return { tipo: 'mesa', nombre: spec.mesa, cerrada: raiz.buscarMesa(spec.mesa).estaCerrada() };
  return { tipo: 'unidad', nombre: spec.nombre, nivel: spec.nivel, hijos: spec.hijos.map((h) => serializarArbol(h, raiz)) };
}

module.exports = { crearEleccion, tarjetonDe, serializarArbol, URNA_VIRTUAL };
