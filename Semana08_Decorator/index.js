const { ReporteElectoral } = require('./reporte-electoral');
const { ReporteResultadosBase } = require('./reporte-resultados-base');
const { ReporteDecorator } = require('./reporte-decorator');
const { EncabezadoInstitucional, PieConFirma, MarcaAgua, NotasAlMargen } = require('./decoradores-concretos');

module.exports = {
  ReporteElectoral, ReporteResultadosBase, ReporteDecorator,
  EncabezadoInstitucional, PieConFirma, MarcaAgua, NotasAlMargen,
};
