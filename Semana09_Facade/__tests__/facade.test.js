process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'admin';
process.env.DB_PASS = 'secret';
process.env.API_KEY = 'abc123';

const { ProcesoVotacionFacade, UrnaElectronica, RegistroVotantes } = require('../index');
const { UnidadElectoral, MesaVotacion } = require('../../Semana08_Composite');
const { VerificadorIdentidadAdapter, ServicioPadronExterno } = require('../../Semana07_Adapter');
const { CanalSMS } = require('../../Semana07_Bridge');
const { FabricaVotacionPresencial } = require('../../Semana04_Abstract_Factory/canal-presencial');
const { FabricaVotacionVirtual } = require('../../Semana04_Abstract_Factory/canal-virtual');
const { LoggerCentralizado } = require('../../Semana03/singleton-votacion');

const historial = () => LoggerCentralizado.obtenerInstancia().obtenerHistorial();

function escenario(fabrica = new FabricaVotacionPresencial(), verificador) {
  const mesa1 = new MesaVotacion('Mesa 1');
  const mesa2 = new MesaVotacion('Mesa 2');
  const urnaVirtual = new MesaVotacion('URNA-VIRTUAL');
  const raiz = new UnidadElectoral('Bucaramanga', 'Municipio');
  raiz.agregar(mesa1).agregar(mesa2).agregar(urnaVirtual);

  const fachada = new ProcesoVotacionFacade({
    verificador: verificador || new VerificadorIdentidadAdapter(new ServicioPadronExterno()),
    fabricaCanal: fabrica,
    urna: new UrnaElectronica(raiz),
  });
  return { fachada, raiz, mesa1, mesa2, urnaVirtual };
}

const presencial = (documento, extra = {}) => ({
  documento,
  datosVotante: { identificacion: documento, verificadoPorEncargado: true },
  candidato: 'Ana',
  mesa: 'Mesa 1',
  ...extra,
});

describe('Facade: ProcesoVotacionFacade', () => {
  test('un voto presencial valido recorre todo el flujo con UNA sola llamada', () => {
    const { fachada, raiz } = escenario();
    const r = fachada.emitirVoto(presencial('1098765432'));

    expect(r.exito).toBe(true);
    expect(r.datos.comprobante.canal).toBe('presencial');
    expect(r.datos.comprobante.formato).toBe('digital');
    expect(r.datos.idVotoAnonimo).toEqual(expect.any(String));
    expect(raiz.getResultados()).toEqual({ Ana: 1 });
  });

  test('un voto virtual usa la otra familia sin cambiar el codigo de la fachada', () => {
    const { fachada, urnaVirtual } = escenario(new FabricaVotacionVirtual());
    const r = fachada.emitirVoto({
      documento: '1012345678',
      datosVotante: { otpIngresado: '4821', otpEsperado: '4821' },
      candidato: 'Luis',
      mesa: 'URNA-VIRTUAL',
      dispositivoId: 'device-77',
    });

    expect(r.exito).toBe(true);
    expect(r.datos.comprobante.canal).toBe('virtual');
    expect(urnaVirtual.getResultados()).toEqual({ Luis: 1 });
  });

  test('rechaza un documento que no esta en el padron (Adapter) y no cuenta el voto', () => {
    const { fachada, raiz } = escenario();
    const r = fachada.emitirVoto(presencial('901234567')); // empieza en 9: NOT_FOUND
    expect(r.exito).toBe(false);
    expect(r.mensaje).toContain('padron');
    expect(raiz.getTotalVotos()).toBe(0);
  });

  test('rechaza si falla la autenticacion del canal', () => {
    const { fachada, raiz } = escenario();
    const r = fachada.emitirVoto(presencial('1098765432', {
      datosVotante: { identificacion: '1098765432', verificadoPorEncargado: false },
    }));
    expect(r.exito).toBe(false);
    expect(r.mensaje).toContain('verificacion_asistida');
    expect(raiz.getTotalVotos()).toBe(0);
  });

  test('impide votar dos veces', () => {
    const { fachada, raiz } = escenario();
    expect(fachada.emitirVoto(presencial('1098765432')).exito).toBe(true);
    const segundo = fachada.emitirVoto(presencial('1098765432', { candidato: 'Luis' }));
    expect(segundo.exito).toBe(false);
    expect(segundo.mensaje).toContain('ya emitio');
    expect(raiz.getResultados()).toEqual({ Ana: 1 });
  });

  test('rechaza un voto invalido segun el validador del canal', () => {
    const { fachada, raiz } = escenario();
    const r = fachada.emitirVoto(presencial('1098765432', { candidato: undefined }));
    expect(r.exito).toBe(false);
    expect(r.mensaje).toContain('falta candidato o mesa asignada');
    expect(raiz.getTotalVotos()).toBe(0);
  });

  test('si la mesa esta cerrada el voto falla y el votante NO queda marcado como "ya voto"', () => {
    const { fachada, mesa1, mesa2 } = escenario();
    mesa1.cerrar();

    const fallido = fachada.emitirVoto(presencial('1098765432'));
    expect(fallido.exito).toBe(false);
    expect(fallido.mensaje).toContain('cerrada');

    const reintento = fachada.emitirVoto(presencial('1098765432', { mesa: 'Mesa 2' }));
    expect(reintento.exito).toBe(true);
    expect(mesa2.getTotalVotos()).toBe(1);
  });

  test('una mesa inexistente se rechaza de forma controlada', () => {
    const { fachada } = escenario();
    const r = fachada.emitirVoto(presencial('1098765432', { mesa: 'Mesa 99' }));
    expect(r.exito).toBe(false);
    expect(r.mensaje).toContain('no existe');
  });

  test('secreto del voto: la auditoria del voto NO contiene documento ni candidato', () => {
    const { fachada } = escenario();
    const antes = historial().length;
    fachada.emitirVoto(presencial('1098765432', { candidato: 'CandidatoSecreto' }));

    const entradaVoto = historial().slice(antes).find((e) => e.nivel === 'AUDITORIA_VOTO');
    expect(Object.keys(entradaVoto.contexto).sort()).toEqual(['idVotoAnonimo', 'mesaOColegio']);
    expect(JSON.stringify(entradaVoto)).not.toContain('1098765432');
    expect(JSON.stringify(entradaVoto)).not.toContain('CandidatoSecreto');
  });

  test('los rechazos tambien quedan auditados, solo con la etapa y sin datos personales', () => {
    const { fachada } = escenario();
    const antes = historial().length;
    fachada.emitirVoto(presencial('901234567', { candidato: 'CandidatoSecreto' }));

    const warn = historial().slice(antes).find((e) => e.nivel === 'WARN');
    expect(warn.mensaje).toBe('Voto rechazado');
    expect(warn.contexto).toEqual({ etapa: 'identidad' });
  });

  test('DIP: acepta cualquier verificador con la misma interfaz (doble de prueba)', () => {
    const siempreValido = { verificar: () => ({ valido: true, nombreCompleto: 'Doble' }) };
    const { fachada } = escenario(new FabricaVotacionPresencial(), siempreValido);
    expect(fachada.emitirVoto(presencial('901234567')).exito).toBe(true); // el padron real lo habria rechazado
  });

  test('no publica resultados con mesas abiertas; al cerrar todas, avisa por el canal (Bridge)', () => {
    const { fachada } = escenario();
    fachada.emitirVoto(presencial('1098765432'));
    fachada.emitirVoto(presencial('1012345678', { candidato: 'Luis', mesa: 'Mesa 2' }));

    const pedido = { nombreEleccion: 'Alcaldia', destinatario: '3000000000', canalEnvio: new CanalSMS() };
    const prematuro = fachada.publicarResultados(pedido);
    expect(prematuro.exito).toBe(false);
    expect(prematuro.mensaje).toContain('mesas abiertas');

    fachada.cerrarMesa('Mesa 1'); fachada.cerrarMesa('Mesa 2'); fachada.cerrarMesa('URNA-VIRTUAL');
    const r = fachada.publicarResultados(pedido);
    expect(r.exito).toBe(true);
    expect(r.datos.aviso).toContain('[SMS -> 3000000000]');
    expect(r.datos.aviso).toContain('Total de votos: 2');
  });

  test('cerrarMesa informa error si la mesa no existe', () => {
    const { fachada } = escenario();
    expect(fachada.cerrarMesa('Mesa 99').exito).toBe(false);
  });

  test('la fachada exige sus dependencias y el registro distingue quien ya voto', () => {
    expect(() => new ProcesoVotacionFacade({})).toThrow('requiere verificador');
    const registro = new RegistroVotantes();
    registro.marcarComoVotado('1098765432');
    expect(registro.yaVoto('1098765432')).toBe(true);
    expect(registro.yaVoto('1098765433')).toBe(false);
  });
});
