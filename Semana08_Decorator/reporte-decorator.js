/**
 * DECORATOR — Decorator abstracto.
 *
 * Mantiene una referencia a OTRO ReporteElectoral y, por defecto, solo
 * delega en el. Los decoradores concretos sobrescriben generar() y
 * getDescripcion() para anadir algo antes o despues de delegar.
 */
const { ReporteElectoral } = require('./reporte-electoral');

class ReporteDecorator extends ReporteElectoral {
  constructor(reporte) {
    super();
    if (!(reporte instanceof ReporteElectoral)) {
      throw new Error('El decorador requiere un ReporteElectoral para envolver');
    }
    // [INGREDIENTE 3] la referencia al componente decorado
    this.reporte = reporte;
  }

  generar() { return this.reporte.generar(); }
  getDescripcion() { return this.reporte.getDescripcion(); }
}

module.exports = { ReporteDecorator };
