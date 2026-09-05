const { ReporteResultados, ReporteResultadosPDF, ReporteResultadosCSV } = require('./reporte-resultados');
const { GeneradorReporte, GeneradorReportePDF, GeneradorReporteCSV } = require('./generador-reporte');
const { ReporteResultadosJSON, GeneradorReporteJSON } = require('./reporte-json-extension');

module.exports = {
  ReporteResultados,
  ReporteResultadosPDF,
  ReporteResultadosCSV,
  ReporteResultadosJSON,
  GeneradorReporte,
  GeneradorReportePDF,
  GeneradorReporteCSV,
  GeneradorReporteJSON,
};
