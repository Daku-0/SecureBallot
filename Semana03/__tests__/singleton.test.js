// Variables de entorno necesarias para que ConfiguracionGlobal no falle
// al arrancar (en el proyecto real vendrían de un archivo .env)
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'admin';
process.env.DB_PASS = 'secret';
process.env.API_KEY = 'abc123';

const {
  ConfiguracionGlobal,
  LoggerCentralizado,
  PoolConexionesDB,
} = require('../singleton-votacion.js');

describe('ConfiguracionGlobal', () => {
  test('obtenerInstancia() siempre devuelve el mismo objeto', () => {
    const c1 = ConfiguracionGlobal.obtenerInstancia();
    const c2 = ConfiguracionGlobal.obtenerInstancia();
    expect(c1).toBe(c2);
  });

  test('usar "new" directamente lanza un error', () => {
    ConfiguracionGlobal.obtenerInstancia();
    expect(() => new ConfiguracionGlobal()).toThrow();
  });
});

describe('LoggerCentralizado', () => {
  test('obtenerInstancia() siempre devuelve el mismo objeto', () => {
    const log1 = LoggerCentralizado.obtenerInstancia();
    const log2 = LoggerCentralizado.obtenerInstancia();
    expect(log1).toBe(log2);
  });

  test('la cadena de hashes mantiene su integridad tras registrar un voto', () => {
    const logger = LoggerCentralizado.obtenerInstancia();
    logger.registrarVoto('voto-anon-001', 'mesa-5');
    expect(logger.verificarIntegridad()).toBe(true);
  });
});

describe('PoolConexionesDB', () => {
  test('obtenerInstancia() siempre devuelve el mismo objeto', () => {
    const pool1 = PoolConexionesDB.obtenerInstancia();
    const pool2 = PoolConexionesDB.obtenerInstancia();
    expect(pool1).toBe(pool2);
  });

  test('usar "new" directamente lanza un error', () => {
    PoolConexionesDB.obtenerInstancia();
    expect(() => new PoolConexionesDB()).toThrow();
  });

  test('el contador de conexiones activas sube al pedir una conexion', async () => {
    const pool = PoolConexionesDB.obtenerInstancia();
    const antes = pool.conexionesActivas;
    await pool.obtenerConexion();
    expect(pool.conexionesActivas).toBe(antes + 1);
  });
});