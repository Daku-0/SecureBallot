process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'admin';
process.env.DB_PASS = 'secret';
process.env.API_KEY = 'abc123';

const { ServicioPadronExterno } = require('../servicio-padron-externo');
const { VerificadorIdentidadAdapter } = require('../verificador-identidad-adapter');
const { VerificadorIdentidad } = require('../verificador-identidad');
const { LoggerCentralizado } = require('../../Semana03/singleton-votacion');

describe('VerificadorIdentidadAdapter', () => {
  test('es una instancia de VerificadorIdentidad (cumple el Target)', () => {
    const verificador = new VerificadorIdentidadAdapter(new ServicioPadronExterno());
    expect(verificador).toBeInstanceOf(VerificadorIdentidad);
  });

  test('traduce una respuesta OK del Adaptee a {valido, nombreCompleto}', () => {
    const verificador = new VerificadorIdentidadAdapter(new ServicioPadronExterno());
    const resultado = verificador.verificar('1098765432');

    expect(resultado).toEqual({ valido: true, nombreCompleto: 'Ciudadano 1098765432' });
  });

  test('traduce una respuesta NOT_FOUND del Adaptee a valido:false', () => {
    const verificador = new VerificadorIdentidadAdapter(new ServicioPadronExterno());
    const resultado = verificador.verificar('901234567');

    expect(resultado).toEqual({ valido: false, nombreCompleto: null });
  });

  test('cada verificacion queda registrada en el LoggerCentralizado', () => {
    const verificador = new VerificadorIdentidadAdapter(new ServicioPadronExterno());
    const antes = LoggerCentralizado.obtenerInstancia().obtenerHistorial().length;

    verificador.verificar('1012345678');

    const despues = LoggerCentralizado.obtenerInstancia().obtenerHistorial().length;
    expect(despues).toBe(antes + 1);
  });

  test('funciona con un Adaptee distinto, sin cambiar el Adapter (prueba de desacoplamiento)', () => {
    // Un segundo "servicio externo" con la MISMA firma que ServicioPadronExterno,
    // simulando un proveedor distinto (ej. otra entidad de verificacion).
    class OtroServicioExterno {
      consultarCedula(cedula) {
        return { status: 'OK', data: { nombreCompleto: 'Otro Proveedor', habilitado: true }, errorCode: null };
      }
    }

    const verificador = new VerificadorIdentidadAdapter(new OtroServicioExterno());
    const resultado = verificador.verificar('1234567890');

    expect(resultado.valido).toBe(true);
    expect(resultado.nombreCompleto).toBe('Otro Proveedor');
  });
});