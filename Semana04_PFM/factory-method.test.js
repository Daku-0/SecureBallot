const { LoggerCentralizado } = require('../Semana03/singleton-votacion');
const {
  ReporteResultados,
  ReporteResultadosPDF,
  ReporteResultadosCSV,
} = require('./reporte-resultados');
const {
  GeneradorReporte,
  GeneradorReportePDF,
  GeneradorReporteCSV,
} = require('./generador-reporte');
const {
  ReporteResultadosJSON,
  GeneradorReporteJSON,
} = require('./reporte-json-extension');

const datosEleccionEjemplo = {
  nombreEleccion: 'Elección Estudiantil 2026',
  fecha: '2026-09-04',
  resultados: [
    { candidato: 'Lista A', votos: 120 },
    { candidato: 'Lista B', votos: 95 },
  ],
};

describe('Factory Method — Generación de reportes de resultados electorales', () => {
  // 1) Cada creador concreto genera el producto correcto
  test('GeneradorReportePDF crea una instancia de ReporteResultadosPDF', () => {
    const reporte = new GeneradorReportePDF().crearReporte();
    expect(reporte).toBeInstanceOf(ReporteResultadosPDF);
  });

  test('GeneradorReporteCSV crea una instancia de ReporteResultadosCSV', () => {
    const reporte = new GeneradorReporteCSV().crearReporte();
    expect(reporte).toBeInstanceOf(ReporteResultadosCSV);
  });

  // 2) Los productos concretos cumplen la abstracción común
  test('todos los productos concretos son instancias de ReporteResultados', () => {
    expect(new ReporteResultadosPDF()).toBeInstanceOf(ReporteResultados);
    expect(new ReporteResultadosCSV()).toBeInstanceOf(ReporteResultados);
    expect(new ReporteResultadosJSON()).toBeInstanceOf(ReporteResultados);
  });

  // 3) El creador trabaja con el producto sin depender de su implementación concreta
  test('el Creador base expone el Factory Method como abstracto (obliga a las subclases a implementarlo)', () => {
    const creadorBase = new GeneradorReporte();
    expect(() => creadorBase.crearReporte()).toThrow();
  });

  test('generarReporteOficial usa la abstracción devuelta por crearReporte(), no una clase concreta fija', () => {
    const resultado = new GeneradorReportePDF().generarReporteOficial(datosEleccionEjemplo);
    expect(resultado.formato).toBe('pdf');
    expect(resultado.contenido).toContain('Lista A: 120 votos');
  });

  // 4) Diferentes creadores producen diferentes productos a partir de los mismos datos
  test('distintos creadores concretos producen salidas en formatos distintos para los mismos datos de entrada', () => {
    const pdf = new GeneradorReportePDF().generarReporteOficial(datosEleccionEjemplo);
    const csv = new GeneradorReporteCSV().generarReporteOficial(datosEleccionEjemplo);

    expect(pdf.formato).toBe('pdf');
    expect(csv.formato).toBe('csv');
    expect(pdf.contenido).not.toBe(csv.contenido);
  });

  // 5) OCP: agregar un producto nuevo no obliga a modificar la lógica del creador
  test('OCP: GeneradorReporteJSON reutiliza generarReporteOficial() sin que esta se haya modificado', () => {
    const resultado = new GeneradorReporteJSON().generarReporteOficial(datosEleccionEjemplo);
    const datos = JSON.parse(resultado.contenido);

    expect(resultado.formato).toBe('json');
    expect(datos.totalVotos).toBe(215);
    // Prueba indirecta de OCP: GeneradorReporteJSON hereda de la misma
    // clase base que PDF y CSV, sin que esa clase base haya cambiado.
    expect(new GeneradorReporteJSON()).toBeInstanceOf(GeneradorReporte);
  });

  // 6) Integración con lo que ya existe en el proyecto (Singleton)
  test('cada reporte generado queda registrado en el LoggerCentralizado (Singleton) ya existente', () => {
    const logger = LoggerCentralizado.obtenerInstancia();
    const cantidadAntes = logger.obtenerHistorial().length;

    new GeneradorReportePDF().generarReporteOficial(datosEleccionEjemplo);

    const historial = logger.obtenerHistorial();
    expect(historial.length).toBe(cantidadAntes + 1);
    expect(historial[historial.length - 1].mensaje).toBe(
      'Reporte de resultados electorales generado'
    );
    // La integridad de la cadena de hashes del Singleton se mantiene intacta.
    expect(logger.verificarIntegridad()).toBe(true);
  });

  test('datos de elección inválidos son rechazados antes de generar cualquier reporte', () => {
    const generador = new GeneradorReportePDF();
    expect(() => generador.generarReporteOficial({})).toThrow();
    expect(() => generador.generarReporteOficial(null)).toThrow();
  });
});
