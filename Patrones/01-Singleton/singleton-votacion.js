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
 *
 * Los 3 ingredientes del patrón Singleton que vas a ver repetidos en las
 * tres clases de abajo:
 *   1) Campo static privado -> guarda la única instancia que puede existir
 *   2) "Constructor privado" simulado -> bloquea el uso de "new" si ya
 *      existe una instancia (en JS no hay constructores privados de
 *      verdad como en Java, por eso se simula con un throw)
 *   3) Método static público -> es la única puerta de entrada permitida
 *      para pedir la instancia
 */

const crypto = require('crypto');

// ============================================================
// 1. CONFIGURACIÓN GLOBAL (Singleton)
// ============================================================

// Guarda credenciales y parámetros del sistema en un solo lugar, para que
// ningún módulo (auth, conteo, auditoría) trabaje con una copia distinta
// o desactualizada de la configuración.
// ============================================================
class ConfiguracionGlobal {
  // [INGREDIENTE 1] Campo static privado: aquí y solo aquí vive la
  // única instancia de esta clase que va a existir en todo el sistema.
  static #instancia = null;

  #config;

  constructor() {
    // [INGREDIENTE 2] "Constructor privado" simulado: si ya existe una
    // instancia y alguien intenta crear otra con "new", se bloquea aquí.
    if (ConfiguracionGlobal.#instancia) {
      throw new Error('Usa ConfiguracionGlobal.obtenerInstancia(), no "new"');
    }

    // Se arma la configuración leyendo variables de entorno (nunca
    // credenciales escritas directamente en el código).
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

  // [INGREDIENTE 3] Método static público: única puerta de entrada.
  // Si no existe la instancia la crea (lazy initialization), si ya
  // existe simplemente devuelve la misma de siempre.
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

// Este es el más importante para la auditoría del proyecto: si hubiera
// varias instancias del logger, el historial de eventos quedaría
// partido entre ellas y ya no se podría confiar en el orden real de
// lo que pasó durante la votación.
// ============================================================

class LoggerCentralizado {

  // [INGREDIENTE 1] Campo static privado.

  static #instancia = null;

  #historial = [];
  // Hash "semilla" (64 ceros) que arranca la cadena. El primer registro
  // se encadena contra este valor.
  #ultimoHash = '0'.repeat(64);

  constructor() {
    // [INGREDIENTE 2] "Constructor privado" simulado.
    if (LoggerCentralizado.#instancia) {
      throw new Error('Usa LoggerCentralizado.obtenerInstancia(), no "new"');
    }
    LoggerCentralizado.#instancia = this;
  }

  // [INGREDIENTE 3] Método static público.
  static obtenerInstancia() {
    if (!LoggerCentralizado.#instancia) {
      new LoggerCentralizado();
    }
    return LoggerCentralizado.#instancia;
  }

  // Genera un hash SHA-256 del objeto recibido. Se usa para encadenar
  // cada entrada del log con la anterior.
  #hashDe(objeto) {
    return crypto.createHash('sha256').update(JSON.stringify(objeto)).digest('hex');
  }

  registrar(nivel, mensaje, contexto = {}) {
    const entrada = {
      timestamp: new Date().toISOString(),
      nivel,
      mensaje,
      contexto,
      hashAnterior: this.#ultimoHash, // encadena esta entrada con la anterior
    };
    entrada.hash = this.#hashDe(entrada);
    this.#ultimoHash = entrada.hash;

    // Object.freeze: una vez guardada, la entrada no se puede modificar
    // en memoria. Es una capa extra de protección del rastro de auditoría.
    this.#historial.push(Object.freeze(entrada));

    console.log(`[${entrada.timestamp}] [${nivel}] ${mensaje}`);
    return entrada.hash;
  }

  // Método específico para eventos de voto: nunca se registra la
  // identidad del votante, solo el evento y un id anónimo/hash. Esto es
  // clave para no comprometer el secreto del voto mientras se audita.
  registrarVoto(idVotoAnonimo, mesaOColegio) {
    return this.registrar('AUDITORIA_VOTO', 'Voto registrado', {
      idVotoAnonimo,
      mesaOColegio,
    });
  }

  obtenerHistorial() {
    return [...this.#historial]; // copia defensiva, el original es inmutable
  }

  // Recalcula la cadena de hashes desde cero y compara contra la
  // guardada: si alguien alteró una entrada (en memoria o en la BD),
  // el hash recalculado no va a coincidir y esto devuelve false.
  // Esto es la "prueba" de que se puede correr para el Punto 3.
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

// Evita que el sistema abra conexiones a la base de datos sin control,
// algo crítico pensando en un escenario de elección nacional con miles
// de personas votando al mismo tiempo.
// ============================================================
class PoolConexionesDB {
  // [INGREDIENTE 1] Campo static privado.
  static #instancia = null;

  #conexionesActivas = 0;
  #maxConexiones;
  #colaEspera = []; // peticiones que esperan turno cuando se llega al límite

  constructor() {
    // [INGREDIENTE 2] "Constructor privado" simulado.
    if (PoolConexionesDB.#instancia) {
      throw new Error('Usa PoolConexionesDB.obtenerInstancia(), no "new"');
    }
    // Nota: este Singleton depende de otro Singleton (ConfiguracionGlobal)
    // para saber cuál es el máximo de conexiones permitido.
    const config = ConfiguracionGlobal.obtenerInstancia();
    this.#maxConexiones = config.get('maxConexiones');
    PoolConexionesDB.#instancia = this;
  }

  // [INGREDIENTE 3] Método static público.
  static obtenerInstancia() {
    if (!PoolConexionesDB.#instancia) {
      new PoolConexionesDB();
    }
    return PoolConexionesDB.#instancia;
  }

  async obtenerConexion() {
    const logger = LoggerCentralizado.obtenerInstancia();

    // Si ya se llegó al máximo de conexiones simultáneas, la petición
    // se queda esperando en una cola en vez de saturar la base de datos.
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
    // Si hay alguien esperando en la cola, le da paso apenas se libera
    // una conexión.
    const siguiente = this.#colaEspera.shift();
    if (siguiente) siguiente();
  }

  get conexionesActivas() {
    return this.#conexionesActivas;
  }
}

// ============================================================
// 4. USO EN LOS SERVICIOS (antes hard-codeados)
// Estas dos clases muestran el patrón "consumido" desde afuera: ambas
// llaman a obtenerInstancia() en vez de crear sus propias copias de
// configuración o de logger.
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