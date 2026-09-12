process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'admin';
process.env.DB_PASS = 'secret';
process.env.API_KEY = 'abc123';

const { EleccionBuilderEstandar, ConfiguradorEleccionEstandar } = require('./index');
const { GeneradorReportePDF } = require('../Semana04_PFM/generador-reporte');

const director = new ConfiguradorEleccionEstandar();
const builder = new EleccionBuilderEstandar();

const eleccion = director.configurar(builder, {
  nombre: 'Representante Estudiantil 2026',
  candidatos: ['Ana Torres', 'Luis Gómez'],
  mesas: ['Mesa 1', 'Mesa 2'],
  fechaApertura: '2026-09-04T08:00',
  fechaCierre: '2026-09-04T17:00',
  permiteVotoBlanco: true,
  umbralQuorum: 500,
});

console.log('--- Elección construida (import via index.js) ---');
console.log(eleccion);

const resultados = eleccion.candidatos.map((c, i) => ({ candidato: c, votos: i === 0 ? 340 : 298 }));
const datosEleccion = { nombreEleccion: eleccion.nombre, fecha: eleccion.fechaCierre, resultados };

console.log('\n--- Reporte via Factory Method existente ---');
console.log(new GeneradorReportePDF().generarReporteOficial(datosEleccion).contenido);