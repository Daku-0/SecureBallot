process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'admin';
process.env.DB_PASS = 'secret';
process.env.API_KEY = 'abc123';

const { CanalEmail, CanalSMS, CanalPush } = require('../canal-envio');
const {
  NotificacionResultadoPublicado,
  NotificacionAperturaMesa,
} = require('../tipos-notificacion');
const { LoggerCentralizado } = require('../../Semana03/singleton-votacion');

describe('Bridge: Notificacion x CanalEnvio', () => {
  test('el mismo tipo de notificacion funciona con distintos canales sin crear clases nuevas', () => {
    const datos = { nombreEleccion: 'Prueba', totalVotos: 10 };

    const porEmail = new NotificacionResultadoPublicado(new CanalEmail()).enviar('a@x.com', datos);
    const porSMS = new NotificacionResultadoPublicado(new CanalSMS()).enviar('3000000000', datos);
    const porPush = new NotificacionResultadoPublicado(new CanalPush()).enviar('deviceId', datos);

    expect(porEmail).toContain('[EMAIL ->');
    expect(porSMS).toContain('[SMS ->');
    expect(porPush).toContain('[PUSH ->');
    // Las tres comparten el mismo contenido de fondo, solo cambia el canal
    expect(porEmail).toContain('Total de votos: 10');
    expect(porSMS).toContain('Total de votos: 10');
    expect(porPush).toContain('Total de votos: 10');
  });

  test('distintos tipos de notificacion generan contenido distinto con el mismo canal', () => {
    const resultado = new NotificacionResultadoPublicado(new CanalEmail())
      .enviar('a@x.com', { nombreEleccion: 'X', totalVotos: 1 });
    const apertura = new NotificacionAperturaMesa(new CanalEmail())
      .enviar('a@x.com', { mesa: 'Mesa 1', hora: '08:00' });

    expect(resultado).not.toBe(apertura);
    expect(apertura).toContain('Mesa 1');
  });

  test('cada envio queda registrado en el LoggerCentralizado del Singleton', () => {
    const antes = LoggerCentralizado.obtenerInstancia().obtenerHistorial().length;

    new NotificacionAperturaMesa(new CanalSMS()).enviar('3000000000', { mesa: 'Mesa 2', hora: '09:00' });

    const despues = LoggerCentralizado.obtenerInstancia().obtenerHistorial().length;
    expect(despues).toBe(antes + 1);
  });
});