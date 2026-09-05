/**
 * FACTORY METHOD — Creador y creadores concretos.
 *
 * Se integra con el Singleton LoggerCentralizado ya existente en el
 * proyecto (Semana 2): cada reporte generado queda registrado en el
 * mismo historial de auditoría con cadena de hashes, sin crear un
 * logging paralelo.
 */

const { LoggerCentralizado } = require('../Semana03/singleton-votacion');
const { ReporteResultadosPDF, ReporteResultadosCSV } = require('./reporte-resultados');

/**
 * ---------------------------------------------------------------
 * [INGREDIENTE 3] CREADOR
 * ---------------------------------------------------------------
 * Contiene:
 *  a) El Factory Method (`crearReporte`), que las subclases sobrescriben.
 *  b) Un método de negocio (`generarReporteOficial`) que NUNCA hace
 *     referencia a ReporteResultadosPDF ni a ReporteResultadosCSV: solo
 *     conoce la abstracción ReporteResultados devuelta por el Factory
 *     Method. Esto es lo que realmente reduce el acoplamiento — no el
 *     simple hecho de tener una función que crea objetos.
 */
class GeneradorReporte {
  // Factory Method: decide QUÉ producto concreto crear. La clase base
  // no lo implementa; obliga a cada creador concreto a hacerlo.
  crearReporte() {
    throw new Error('crearReporte() debe ser implementado por el creador concreto');
  }

  // Lógica de negocio compartida por TODOS los formatos de reporte.
  // Si mañana se agrega un paso común (ej. firmar digitalmente el
  // reporte), se agrega aquí UNA sola vez y todos los formatos lo
  // heredan automáticamente.
  generarReporteOficial(datosEleccion) {
    this.#validar(datosEleccion);

    const reporte = this.crearReporte(); // <- aquí ocurre el Factory Method
    const resultado = reporte.generar(datosEleccion);

    LoggerCentralizado.obtenerInstancia().registrar(
      'INFO',
      'Reporte de resultados electorales generado',
      { formato: resultado.formato, eleccion: datosEleccion.nombreEleccion }
    );

    return resultado;
  }

  #validar(datosEleccion) {
    if (!datosEleccion || !Array.isArray(datosEleccion.resultados)) {
      throw new Error('Datos de elección inválidos');
    }
  }
}

/**
 * ---------------------------------------------------------------
 * [INGREDIENTE 4] CREADORES CONCRETOS
 * ---------------------------------------------------------------
 * Cada uno sobrescribe ÚNICAMENTE crearReporte(). No duplican la
 * lógica de negocio de generarReporteOficial().
 */
class GeneradorReportePDF extends GeneradorReporte {
  crearReporte() {
    return new ReporteResultadosPDF();
  }
}

class GeneradorReporteCSV extends GeneradorReporte {
  crearReporte() {
    return new ReporteResultadosCSV();
  }
}

module.exports = {
  GeneradorReporte,
  GeneradorReportePDF,
  GeneradorReporteCSV,
};
