/**
 * REFACTOR: Patrón Singleton aplicado a una plataforma de votación segura.
 *
 * Problema original:
 *  - Credenciales hard-codeadas en clases estáticas.
 *  - Sin control central del número de conexiones a BD.
 *  - Sin logging/auditoría centralizada (crítico en un sistema de votación,
 *    donde se necesita un rastro verificable de eventos).
 *
 * Solución:
 *  - ConfiguracionGlobal: única fuente de verdad, lee de variables de entorno.
 *  - LoggerCentralizado: única instancia que escribe el log de auditoría
 *    con encadenamiento por hash (evidencia de manipulación si alguien
 *    edita el historial).
 *  - PoolConexionesDB: única instancia que controla el límite de
 *    conexiones simultáneas a la base de datos.
 */

const crypto = require('crypto');

// ============================================================
// 1. CONFIGURACIÓN GLOBAL (Singleton)
// ============================================================
class ConfiguracionGlobal {
  static #instancia = null;
  #config;

  constructor() {
    if (ConfiguracionGlobal.#instancia) {
      throw new Error('Usa ConfiguracionGlobal.obtenerInstancia(), no "new"');
    }

    this.#config = {
      dbHost: process.env.DB_HOST,
      dbPort: parseInt(process.env.DB_PORT || '5432', 10),
      dbUser: process.env.DB_USER,
      dbPass: process.env.DB_PASS,
      apiKey: process.env.API_KEY,
      maxConexiones: parseInt(process.env.MAX_CONEXIONES || '100', 10),
      timeout: parseInt(process.env.TIMEOUT || '30000', 10),
      smtpHost: process.env.SMTP_HOST,
      smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
    };

    this.#validarConfiguracionCritica();
    ConfiguracionGlobal.#instancia = this;
  }

  #validarConfiguracionCritica() {
    // Falla rápido al arrancar si falta algo esencial, en vez de fallar
    // silenciosamente a mitad de una elección.
    const requeridas = ['dbHost', 'dbUser', 'dbPass', 'apiKey'];
    const faltantes = requeridas.filter((c) => !this.#config[c]);
    if (faltantes.length > 0) {
      throw new Error(
        `Faltan variables de entorno requeridas: ${faltantes.join(', ')}`
      );
    }
  }

  static obtenerInstancia() {
    if (!ConfiguracionGlobal.#instancia) {
      new ConfiguracionGlobal();
    }
    return ConfiguracionGlobal.#instancia;
  }

  get(clave) {
    return this.#config[clave];
  }

  urlConexionDB() {
    const c = this.#config;
    return `jdbc:postgresql://${c.dbHost}:${c.dbPort}/sistema_votacion`;
  }
}

// ============================================================
// 2. LOGGER CENTRALIZADO (Singleton) — con cadena de hashes
// ============================================================
class LoggerCentralizado {
  static #instancia = null;
  #historial = [];
  #ultimoHash = '0'.repeat(64);

  constructor() {
    if (LoggerCentralizado.#instancia) {
      throw new Error('Usa LoggerCentralizado.obtenerInstancia(), no "new"');
    }
    LoggerCentralizado.#instancia = this;
  }

  static obtenerInstancia() {
    if (!LoggerCentralizado.#instancia) {
      new LoggerCentralizado();
    }
    return LoggerCentralizado.#instancia;
  }

  #hashDe(objeto) {
    return crypto.createHash('sha256').update(JSON.stringify(objeto)).digest('hex');
  }

  registrar(nivel, mensaje, contexto = {}) {
    const entrada = {
      timestamp: new Date().toISOString(),
      nivel,
      mensaje,
      contexto,
      hashAnterior: this.#ultimoHash,
    };
    entrada.hash = this.#hashDe(entrada);
    this.#ultimoHash = entrada.hash;
    this.#historial.push(Object.freeze(entrada));

    console.log(`[${entrada.timestamp}] [${nivel}] ${mensaje}`);
    return entrada.hash;
  }

  // Método específico para eventos de voto: nunca se registra la
  // identidad del votante, solo el evento y un id anónimo/hash.
  registrarVoto(idVotoAnonimo, mesaOColegio) {
    return this.registrar('AUDITORIA_VOTO', 'Voto registrado', {
      idVotoAnonimo,
      mesaOColegio,
    });
  }

  obtenerHistorial() {
    return [...this.#historial]; // copia defensiva, el original es inmutable
  }

  // Recalcula la cadena de hashes y compara: si alguien alteró una
  // entrada del arreglo en memoria/BD, esto no cuadra.
  verificarIntegridad() {
    let hashPrevio = '0'.repeat(64);
    for (const entrada of this.#historial) {
      const { hash, ...resto } = entrada;
      const hashEsperado = this.#hashDe({ ...resto, hashAnterior: hashPrevio });
      if (hashEsperado !== hash) return false;
      hashPrevio = hash;
    }
    return true;
  }
}

// ============================================================
// 3. POOL DE CONEXIONES A BD (Singleton)
// ============================================================
class PoolConexionesDB {
  static #instancia = null;
  #conexionesActivas = 0;
  #maxConexiones;
  #colaEspera = [];

  constructor() {
    if (PoolConexionesDB.#instancia) {
      throw new Error('Usa PoolConexionesDB.obtenerInstancia(), no "new"');
    }
    const config = ConfiguracionGlobal.obtenerInstancia();
    this.#maxConexiones = config.get('maxConexiones');
    PoolConexionesDB.#instancia = this;
  }

  static obtenerInstancia() {
    if (!PoolConexionesDB.#instancia) {
      new PoolConexionesDB();
    }
    return PoolConexionesDB.#instancia;
  }

  async obtenerConexion() {
    const logger = LoggerCentralizado.obtenerInstancia();

    if (this.#conexionesActivas >= this.#maxConexiones) {
      logger.registrar('WARN', 'Límite de conexiones alcanzado, solicitud en cola');
      await new Promise((resolve) => this.#colaEspera.push(resolve));
    }

    this.#conexionesActivas++;
    logger.registrar(
      'DEBUG',
      `Conexión adquirida (${this.#conexionesActivas}/${this.#maxConexiones})`
    );

    return {
      id: crypto.randomUUID(),
      liberar: () => this.#liberarConexion(),
    };
  }

  #liberarConexion() {
    this.#conexionesActivas--;
    const siguiente = this.#colaEspera.shift();
    if (siguiente) siguiente();
  }

  get conexionesActivas() {
    return this.#conexionesActivas;
  }
}

// ============================================================
// 4. USO EN LOS SERVICIOS (antes hard-codeados)
// ============================================================
class ServicioEmail {
  async enviar(email, mensaje) {
    const config = ConfiguracionGlobal.obtenerInstancia();
    const logger = LoggerCentralizado.obtenerInstancia();

    const smtpHost = config.get('smtpHost');
    const smtpPort = config.get('smtpPort');
    const user = config.get('smtpUser');
    const pass = config.get('smtpPass'); // nunca se loguea

    logger.registrar('INFO', 'Enviando correo', { destinatario: email, smtpHost, smtpPort, user });
    // ... lógica real de envío con nodemailer u otra librería
  }
}

class ApiExterna {
  async obtenerDatos() {
    const config = ConfiguracionGlobal.obtenerInstancia();
    const logger = LoggerCentralizado.obtenerInstancia();
    const timeout = config.get('timeout');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const respuesta = await fetch('https://api.externa.com/v1/data', {
        headers: { Authorization: `Bearer ${config.get('apiKey')}` },
        signal: controller.signal,
      });
      return await respuesta.json();
    } catch (err) {
      logger.registrar('ERROR', 'Fallo al consultar API externa', { error: err.message });
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = {
  ConfiguracionGlobal,
  LoggerCentralizado,
  PoolConexionesDB,
  ServicioEmail,
  ApiExterna,
};
/**
 * REFACTOR: Patrón Singleton aplicado a una plataforma de votación segura.
 *
 * Problema original:
 *  - Credenciales hard-codeadas en clases estáticas.
 *  - Sin control central del número de conexiones a BD.
 *  - Sin logging/auditoría centralizada (crítico en un sistema de votación,
 *    donde se necesita un rastro verificable de eventos).
 *
 * Solución:
 *  - ConfiguracionGlobal: única fuente de verdad, lee de variables de entorno.
 *  - LoggerCentralizado: única instancia que escribe el log de auditoría
 *    con encadenamiento por hash (evidencia de manipulación si alguien
 *    edita el historial).
 *  - PoolConexionesDB: única instancia que controla el límite de
 *    conexiones simultáneas a la base de datos.
 */

const crypto = require('crypto');

// ============================================================
// 1. CONFIGURACIÓN GLOBAL (Singleton)
// ============================================================
class ConfiguracionGlobal {
  static #instancia = null;
  #config;

  constructor() {
    if (ConfiguracionGlobal.#instancia) {
      throw new Error('Usa ConfiguracionGlobal.obtenerInstancia(), no "new"');
    }

    this.#config = {
      dbHost: process.env.DB_HOST,
      dbPort: parseInt(process.env.DB_PORT || '5432', 10),
      dbUser: process.env.DB_USER,
      dbPass: process.env.DB_PASS,
      apiKey: process.env.API_KEY,
      maxConexiones: parseInt(process.env.MAX_CONEXIONES || '100', 10),
      timeout: parseInt(process.env.TIMEOUT || '30000', 10),
      smtpHost: process.env.SMTP_HOST,
      smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
    };

    this.#validarConfiguracionCritica();
    ConfiguracionGlobal.#instancia = this;
  }

  #validarConfiguracionCritica() {
    // Falla rápido al arrancar si falta algo esencial, en vez de fallar
    // silenciosamente a mitad de una elección.
    const requeridas = ['dbHost', 'dbUser', 'dbPass', 'apiKey'];
    const faltantes = requeridas.filter((c) => !this.#config[c]);
    if (faltantes.length > 0) {
      throw new Error(
        `Faltan variables de entorno requeridas: ${faltantes.join(', ')}`
      );
    }
  }

  static obtenerInstancia() {
    if (!ConfiguracionGlobal.#instancia) {
      new ConfiguracionGlobal();
    }
    return ConfiguracionGlobal.#instancia;
  }

  get(clave) {
    return this.#config[clave];
  }

  urlConexionDB() {
    const c = this.#config;
    return `jdbc:postgresql://${c.dbHost}:${c.dbPort}/sistema_votacion`;
  }
}

// ============================================================
// 2. LOGGER CENTRALIZADO (Singleton) — con cadena de hashes
// ============================================================
class LoggerCentralizado {
  static #instancia = null;
  #historial = [];
  #ultimoHash = '0'.repeat(64);

  constructor() {
    if (LoggerCentralizado.#instancia) {
      throw new Error('Usa LoggerCentralizado.obtenerInstancia(), no "new"');
    }
    LoggerCentralizado.#instancia = this;
  }

  static obtenerInstancia() {
    if (!LoggerCentralizado.#instancia) {
      new LoggerCentralizado();
    }
    return LoggerCentralizado.#instancia;
  }

  #hashDe(objeto) {
    return crypto.createHash('sha256').update(JSON.stringify(objeto)).digest('hex');
  }

  registrar(nivel, mensaje, contexto = {}) {
    const entrada = {
      timestamp: new Date().toISOString(),
      nivel,
      mensaje,
      contexto,
      hashAnterior: this.#ultimoHash,
    };
    entrada.hash = this.#hashDe(entrada);
    this.#ultimoHash = entrada.hash;
    this.#historial.push(Object.freeze(entrada));

    console.log(`[${entrada.timestamp}] [${nivel}] ${mensaje}`);
    return entrada.hash;
  }

  // Método específico para eventos de voto: nunca se registra la
  // identidad del votante, solo el evento y un id anónimo/hash.
  registrarVoto(idVotoAnonimo, mesaOColegio) {
    return this.registrar('AUDITORIA_VOTO', 'Voto registrado', {
      idVotoAnonimo,
      mesaOColegio,
    });
  }

  obtenerHistorial() {
    return [...this.#historial]; // copia defensiva, el original es inmutable
  }

  // Recalcula la cadena de hashes y compara: si alguien alteró una
  // entrada del arreglo en memoria/BD, esto no cuadra.
  verificarIntegridad() {
    let hashPrevio = '0'.repeat(64);
    for (const entrada of this.#historial) {
      const { hash, ...resto } = entrada;
      const hashEsperado = this.#hashDe({ ...resto, hashAnterior: hashPrevio });
      if (hashEsperado !== hash) return false;
      hashPrevio = hash;
    }
    return true;
  }
}

// ============================================================
// 3. POOL DE CONEXIONES A BD (Singleton)
// ============================================================
class PoolConexionesDB {
  static #instancia = null;
  #conexionesActivas = 0;
  #maxConexiones;
  #colaEspera = [];

  constructor() {
    if (PoolConexionesDB.#instancia) {
      throw new Error('Usa PoolConexionesDB.obtenerInstancia(), no "new"');
    }
    const config = ConfiguracionGlobal.obtenerInstancia();
    this.#maxConexiones = config.get('maxConexiones');
    PoolConexionesDB.#instancia = this;
  }

  static obtenerInstancia() {
    if (!PoolConexionesDB.#instancia) {
      new PoolConexionesDB();
    }
    return PoolConexionesDB.#instancia;
  }

  async obtenerConexion() {
    const logger = LoggerCentralizado.obtenerInstancia();

    if (this.#conexionesActivas >= this.#maxConexiones) {
      logger.registrar('WARN', 'Límite de conexiones alcanzado, solicitud en cola');
      await new Promise((resolve) => this.#colaEspera.push(resolve));
    }

    this.#conexionesActivas++;
    logger.registrar(
      'DEBUG',
      `Conexión adquirida (${this.#conexionesActivas}/${this.#maxConexiones})`
    );

    return {
      id: crypto.randomUUID(),
      liberar: () => this.#liberarConexion(),
    };
  }

  #liberarConexion() {
    this.#conexionesActivas--;
    const siguiente = this.#colaEspera.shift();
    if (siguiente) siguiente();
  }

  get conexionesActivas() {
    return this.#conexionesActivas;
  }
}

// ============================================================
// 4. USO EN LOS SERVICIOS (antes hard-codeados)
// ============================================================
class ServicioEmail {
  async enviar(email, mensaje) {
    const config = ConfiguracionGlobal.obtenerInstancia();
    const logger = LoggerCentralizado.obtenerInstancia();

    const smtpHost = config.get('smtpHost');
    const smtpPort = config.get('smtpPort');
    const user = config.get('smtpUser');
    const pass = config.get('smtpPass'); // nunca se loguea

    logger.registrar('INFO', 'Enviando correo', { destinatario: email, smtpHost, smtpPort, user });
    // ... lógica real de envío con nodemailer u otra librería
  }
}

class ApiExterna {
  async obtenerDatos() {
    const config = ConfiguracionGlobal.obtenerInstancia();
    const logger = LoggerCentralizado.obtenerInstancia();
    const timeout = config.get('timeout');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const respuesta = await fetch('https://api.externa.com/v1/data', {
        headers: { Authorization: `Bearer ${config.get('apiKey')}` },
        signal: controller.signal,
      });
      return await respuesta.json();
    } catch (err) {
      logger.registrar('ERROR', 'Fallo al consultar API externa', { error: err.message });
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = {
  ConfiguracionGlobal,
  LoggerCentralizado,
  PoolConexionesDB,
  ServicioEmail,
  ApiExterna,
};
