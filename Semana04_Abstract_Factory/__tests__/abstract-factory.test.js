const { LoggerCentralizado } = require('../../Semana03/singleton-votacion');
const { FabricaCanalVotacion } = require('../fabrica-canal-votacion');
const {
  AutenticadorPresencial,
  ValidadorDeVotoPresencial,
  EmisorDeComprobantePresencial,
  FabricaVotacionPresencial,
} = require('../canal-presencial');
const {
  AutenticadorVirtual,
  ValidadorDeVotoVirtual,
  EmisorDeComprobanteVirtual,
  FabricaVotacionVirtual,
} = require('../canal-virtual');

describe('FabricaCanalVotacion (abstracta)', () => {
  test('lanza error si un método no fue implementado por una fábrica concreta', () => {
    const fabricaAbstracta = new FabricaCanalVotacion();
    expect(() => fabricaAbstracta.crearAutenticador()).toThrow();
    expect(() => fabricaAbstracta.crearValidadorDeVoto()).toThrow();
    expect(() => fabricaAbstracta.crearEmisorDeComprobante()).toThrow();
  });
});

describe('FabricaVotacionPresencial — coherencia de familia', () => {
  const fabrica = new FabricaVotacionPresencial();

  test('produce únicamente componentes del canal presencial', () => {
    expect(fabrica.crearAutenticador()).toBeInstanceOf(AutenticadorPresencial);
    expect(fabrica.crearValidadorDeVoto()).toBeInstanceOf(ValidadorDeVotoPresencial);
    expect(fabrica.crearEmisorDeComprobante()).toBeInstanceOf(EmisorDeComprobantePresencial);
  });

  test('autentica solo si hay identificación verificada por un encargado', () => {
    const autenticador = fabrica.crearAutenticador();
    expect(autenticador.autenticar({ identificacion: 'CC-1', verificadoPorEncargado: true }).autenticado).toBe(true);
    expect(autenticador.autenticar({ identificacion: 'CC-1', verificadoPorEncargado: false }).autenticado).toBe(false);
  });

  test('valida solo si el voto tiene candidato y mesa asignada', () => {
    const validador = fabrica.crearValidadorDeVoto();
    expect(validador.validar({ candidato: 'Lista A', mesa: 'Mesa 1' }).valido).toBe(true);
    expect(validador.validar({ candidato: 'Lista A' }).valido).toBe(false);
  });
});

describe('FabricaVotacionVirtual — coherencia de familia', () => {
  const fabrica = new FabricaVotacionVirtual();

  test('produce únicamente componentes del canal virtual', () => {
    expect(fabrica.crearAutenticador()).toBeInstanceOf(AutenticadorVirtual);
    expect(fabrica.crearValidadorDeVoto()).toBeInstanceOf(ValidadorDeVotoVirtual);
    expect(fabrica.crearEmisorDeComprobante()).toBeInstanceOf(EmisorDeComprobanteVirtual);
  });

  test('autentica solo si el OTP ingresado coincide con el esperado', () => {
    const autenticador = fabrica.crearAutenticador();
    expect(autenticador.autenticar({ otpIngresado: '111111', otpEsperado: '111111' }).autenticado).toBe(true);
    expect(autenticador.autenticar({ otpIngresado: '000000', otpEsperado: '111111' }).autenticado).toBe(false);
  });

  test('valida solo si el voto tiene candidato e identificador de dispositivo', () => {
    const validador = fabrica.crearValidadorDeVoto();
    expect(validador.validar({ candidato: 'Lista B', dispositivoId: 'dev-1' }).valido).toBe(true);
    expect(validador.validar({ candidato: 'Lista B' }).valido).toBe(false);
  });
});

describe('Código cliente — no puede mezclar componentes de canales distintos', () => {
  // El cliente solo usa la interfaz FabricaCanalVotacion. Esta prueba
  // demuestra que los tres productos que entrega una misma fábrica
  // siempre pertenecen al mismo canal, sin importar cuál se use.
  function procesarVoto(fabrica, datosVotante, datosVoto) {
    const autenticador = fabrica.crearAutenticador();
    const validador = fabrica.crearValidadorDeVoto();
    const emisor = fabrica.crearEmisorDeComprobante();
    return {
      canalAuth: autenticador.autenticar(datosVotante).canal,
      canalValidacion: validador.validar(datosVoto).canal,
      canalComprobante: emisor.emitir(datosVoto).canal,
    };
  }

  test('con FabricaVotacionPresencial, los tres componentes son del canal presencial', () => {
    const resultado = procesarVoto(
      new FabricaVotacionPresencial(),
      { identificacion: 'CC-1', verificadoPorEncargado: true },
      { candidato: 'Lista A', mesa: 'Mesa 1' }
    );
    expect(resultado).toEqual({
      canalAuth: 'presencial',
      canalValidacion: 'presencial',
      canalComprobante: 'presencial',
    });
  });

  test('con FabricaVotacionVirtual, los tres componentes son del canal virtual', () => {
    const resultado = procesarVoto(
      new FabricaVotacionVirtual(),
      { otpIngresado: '111111', otpEsperado: '111111' },
      { candidato: 'Lista B', dispositivoId: 'dev-1' }
    );
    expect(resultado).toEqual({
      canalAuth: 'virtual',
      canalValidacion: 'virtual',
      canalComprobante: 'virtual',
    });
  });

  test('el comprobante emitido nunca usa formato físico/papel', () => {
    const comprobantePresencial = new FabricaVotacionPresencial().crearEmisorDeComprobante().emitir({ candidato: 'A', mesa: 'M1' });
    const comprobanteVirtual = new FabricaVotacionVirtual().crearEmisorDeComprobante().emitir({ candidato: 'B', dispositivoId: 'dev-1' });
    expect(comprobantePresencial.formato).toBe('digital');
    expect(comprobanteVirtual.formato).toBe('digital');
  });

  // Integración con lo que ya existe en el proyecto (Singleton de auditoría)
  test('procesar un voto queda registrado en el LoggerCentralizado ya existente', () => {
    const logger = LoggerCentralizado.obtenerInstancia();
    const cantidadAntes = logger.obtenerHistorial().length;

    logger.registrarVoto('voto-anon-test', 'Mesa 1');

    const historial = logger.obtenerHistorial();
    expect(historial.length).toBe(cantidadAntes + 1);
    expect(logger.verificarIntegridad()).toBe(true);
  });
});
