/**
 * DEMOSTRACIÓN DE OCP (Open/Closed Principle)
 * ---------------------------------------------------------------
 * Este archivo se agrega COMPLETO y NUEVO. No se tocó ni una línea de:
 *   - reporte-resultados.js
 *   - generador-reporte.js
 *
 * Para soportar un formato JSON (útil, por ejemplo, para un futuro
 * panel de resultados en tiempo real) solo hizo falta:
 *   1) Un producto concreto nuevo (extiende ReporteResultados).
 *   2) Un creador concreto nuevo (extiende GeneradorReporte).
 *
 * El sistema queda "abierto para extensión" (se agregó un formato)
 * y "cerrado para modificación" (el Creador y el resto de productos
 * no cambiaron).
 */

const { ReporteResultados } = require('./reporte-resultados');
const { GeneradorReporte } = require('./generador-reporte');

class ReporteResultadosJSON extends ReporteResultados {
  generar(datosEleccion) {
    if (!datosEleccion || !Array.isArray(datosEleccion.resultados)) {
      throw new Error('Datos de elección inválidos para generar el reporte');
    }
    const totalVotos = datosEleccion.resultados.reduce((acc, r) => acc + r.votos, 0);

    const contenido = JSON.stringify(
      { ...datosEleccion, totalVotos },
      null,
      2
    );

    return { formato: 'json', contenido };
  }

  extension() {
    return 'json';
  }
}

class GeneradorReporteJSON extends GeneradorReporte {
  crearReporte() {
    return new ReporteResultadosJSON();
  }
}

module.exports = {
  ReporteResultadosJSON,
  GeneradorReporteJSON,
};
