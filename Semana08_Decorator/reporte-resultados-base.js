/**
 * DECORATOR — ConcreteComponent.
 *
 * El reporte minimo: votos y porcentaje por candidato. No sabe nada de
 * encabezados, firmas ni marcas de agua.
 */
const { ReporteElectoral } = require('./reporte-electoral');
const { LoggerCentralizado } = require('../Semana03/singleton-votacion');

class ReporteResultadosBase extends ReporteElectoral {
  // [INGREDIENTE 2] CONCRETE COMPONENT
  constructor(nombreEleccion, resultados) {
    super();
    this.nombreEleccion = nombreEleccion;
    this.resultados = { ...resultados }; // copia: el reporte no se altera si cambia el original
  }

  // Construye el reporte desde cualquier elemento del Composite (mesa, municipio, pais...)
  static desdeElemento(nombreEleccion, elemento) {
    return new ReporteResultadosBase(nombreEleccion, elemento.getResultados());
  }

  generar() {
    const entradas = Object.entries(this.resultados)
      .sort(([a, va], [b, vb]) => vb - va || a.localeCompare(b));
    const total = entradas.reduce((suma, [, votos]) => suma + votos, 0);

    const lineas = [`RESULTADOS: ${this.nombreEleccion}`];
    for (const [candidato, votos] of entradas) {
      const porcentaje = total === 0 ? 0 : (votos * 100) / total;
      lineas.push(`${candidato}: ${votos} votos (${porcentaje.toFixed(2)}%)`);
    }
    lineas.push(`Total de votos: ${total}`);

    LoggerCentralizado.obtenerInstancia().registrar(
      'INFO',
      'Reporte de resultados generado',
      { eleccion: this.nombreEleccion, totalVotos: total }
    );

    return lineas.join('\n');
  }

  getDescripcion() {
    return `Resultados de "${this.nombreEleccion}"`;
  }
}

module.exports = { ReporteResultadosBase };
