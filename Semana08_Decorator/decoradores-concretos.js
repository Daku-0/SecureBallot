/**
 * DECORATOR — ConcreteDecorators.
 * Cada uno hace UNA sola cosa y no sabe nada de los demas.
 */
const crypto = require('crypto');
const { ReporteDecorator } = require('./reporte-decorator');

class EncabezadoInstitucional extends ReporteDecorator {
  constructor(reporte, organizacion = 'SecureBallot - Plataforma de Votacion Electronica') {
    super(reporte);
    this.organizacion = organizacion;
  }

  generar() {
    const linea = '='.repeat(this.organizacion.length);
    return `${linea}\n${this.organizacion}\n${linea}\n\n${super.generar()}`;
  }

  getDescripcion() {
    return `Encabezado institucional + ${super.getDescripcion()}`;
  }
}

/**
 * Pie con firma y huella de integridad: el SHA-256 se calcula sobre el
 * contenido que este decorador ENVUELVE, de modo que cualquier cambio
 * posterior a ese contenido se puede detectar recalculando el hash.
 * La fecha se inyecta (`reloj`) para que el reporte sea reproducible en pruebas.
 */
class PieConFirma extends ReporteDecorator {
  constructor(reporte, firmante, reloj = () => new Date()) {
    super(reporte);
    if (!firmante) throw new Error('El pie con firma requiere un firmante');
    this.firmante = firmante;
    this.reloj = reloj;
  }

  generar() {
    const contenido = super.generar();
    const huella = crypto.createHash('sha256').update(contenido).digest('hex');
    return `${contenido}\n\n______________________\n` +
      `Firma: ${this.firmante}\n` +
      `Fecha: ${this.reloj().toISOString()}\n` +
      `Huella SHA-256: ${huella}`;
  }

  getDescripcion() {
    return `${super.getDescripcion()} + Firma de ${this.firmante}`;
  }
}

class MarcaAgua extends ReporteDecorator {
  constructor(reporte, texto) {
    super(reporte);
    if (!texto) throw new Error('La marca de agua requiere un texto');
    this.texto = texto;
  }

  generar() {
    return super.generar()
      .split('\n')
      .map((linea) => (linea === '' ? linea : `[${this.texto}] ${linea}`))
      .join('\n');
  }

  getDescripcion() {
    return `${super.getDescripcion()} + Marca de agua '${this.texto}'`;
  }
}

class NotasAlMargen extends ReporteDecorator {
  #observaciones = [];

  agregarObservacion(texto) {
    this.#observaciones.push(texto);
    return this; // permite encadenar
  }

  generar() {
    const contenido = super.generar();
    if (this.#observaciones.length === 0) return contenido;
    const notas = this.#observaciones.map((o) => `+ ${o}`).join('\n');
    return `${contenido}\n\n--- OBSERVACIONES ---\n${notas}`;
  }

  getDescripcion() {
    return `${super.getDescripcion()} + ${this.#observaciones.length} observaciones`;
  }
}

module.exports = { EncabezadoInstitucional, PieConFirma, MarcaAgua, NotasAlMargen };
