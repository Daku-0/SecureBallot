/**
 * Integracion de los patrones de las semanas 7 a 10 sobre un mismo flujo:
 * votar (Facade + Adapter + Abstract Factory) -> contar (Composite) ->
 * consultar con control de acceso (Proxy) -> emitir reporte (Decorator) ->
 * avisar (Bridge). Verifica el cableado real entre modulos.
 */
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'admin';
process.env.DB_PASS = 'secret';
process.env.API_KEY = 'abc123';

const { crearServicioResultados, ErrorAccesoResultados } = require('../index');
const { ProcesoVotacionFacade, UrnaElectronica } = require('../../Semana09_Facade');
const { UnidadElectoral, MesaVotacion } = require('../../Semana08_Composite');
const { ReporteResultadosBase, EncabezadoInstitucional, PieConFirma } = require('../../Semana08_Decorator');
const { VerificadorIdentidadAdapter, ServicioPadronExterno } = require('../../Semana07_Adapter');
const { CanalEmail } = require('../../Semana07_Bridge');
const { FabricaVotacionPresencial } = require('../../Semana04_Abstract_Factory/canal-presencial');

function montar() {
  const raiz = new UnidadElectoral('Bucaramanga', 'Municipio')
    .agregar(new MesaVotacion('Mesa 1'))
    .agregar(new MesaVotacion('Mesa 2'));
  const fachada = new ProcesoVotacionFacade({
    verificador: new VerificadorIdentidadAdapter(new ServicioPadronExterno()),
    fabricaCanal: new FabricaVotacionPresencial(),
    urna: new UrnaElectronica(raiz),
  });
  const votar = (doc, candidato, mesa) => fachada.emitirVoto({
    documento: doc, datosVotante: { identificacion: doc, verificadoPorEncargado: true }, candidato, mesa,
  });
  return { raiz, fachada, votar };
}

describe('Integracion semanas 7-10', () => {
  test('los votos emitidos por la fachada son exactamente los que consulta el proxy', () => {
    const { raiz, fachada, votar } = montar();
    votar('1000000001', 'Ana', 'Mesa 1');
    votar('1000000002', 'Ana', 'Mesa 2');
    votar('1000000003', 'Luis', 'Mesa 2');
    votar('1000000003', 'Luis', 'Mesa 2'); // doble voto: no cuenta

    fachada.cerrarMesa('Mesa 1'); fachada.cerrarMesa('Mesa 2');
    const r = crearServicioResultados({ raiz, usuario: 'aud1', rol: 'AUDITOR' }).consultar();

    expect(r.totalVotos).toBe(3);
    expect(r.votosPorCandidato).toEqual({ Ana: 2, Luis: 1 });
    expect(r.ganador).toBe('Ana');
  });

  test('un votante no puede ver resultados aunque la eleccion ya este cerrada', () => {
    const { raiz, fachada, votar } = montar();
    votar('1000000001', 'Ana', 'Mesa 1');
    fachada.cerrarMesa('Mesa 1'); fachada.cerrarMesa('Mesa 2');
    const proxy = crearServicioResultados({ raiz, usuario: 'v1', rol: 'VOTANTE' });
    expect(() => proxy.consultar()).toThrow(ErrorAccesoResultados);
  });

  test('el resultado del proxy alimenta un reporte decorado con huella verificable', () => {
    const { raiz, fachada, votar } = montar();
    votar('1000000001', 'Ana', 'Mesa 1');
    votar('1000000002', 'Luis', 'Mesa 2');
    fachada.cerrarMesa('Mesa 1'); fachada.cerrarMesa('Mesa 2');

    const r = crearServicioResultados({ raiz, usuario: 'aud1', rol: 'AUDITOR' }).consultar();
    const reporte = new PieConFirma(
      new EncabezadoInstitucional(new ReporteResultadosBase('Alcaldia', r.votosPorCandidato)),
      'Registrador Delegado'
    ).generar();

    expect(reporte).toContain('Total de votos: 2');
    expect(reporte).toMatch(/Huella SHA-256: [0-9a-f]{64}/);
  });

  test('el total que publica la fachada (Bridge) coincide con el consolidado del proxy', () => {
    const { raiz, fachada, votar } = montar();
    votar('1000000001', 'Ana', 'Mesa 1');
    votar('1000000002', 'Ana', 'Mesa 1');
    fachada.cerrarMesa('Mesa 1'); fachada.cerrarMesa('Mesa 2');

    const aviso = fachada.publicarResultados({ nombreEleccion: 'Alcaldia', destinatario: 'a@x.com', canalEnvio: new CanalEmail() });
    const total = crearServicioResultados({ raiz, usuario: 'aud1', rol: 'AUDITOR' }).consultar().totalVotos;
    expect(aviso.datos.aviso).toContain(`Total de votos: ${total}`);
  });
});
