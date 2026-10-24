/**
 * DECORATOR — Component.
 *
 * Contrato comun del reporte de resultados. Tanto el reporte base como
 * cada decorador lo cumplen, por eso se pueden anidar en cualquier orden.
 */
class ReporteElectoral {
  // [INGREDIENTE 1] COMPONENT
  generar() { throw new Error('generar() debe implementarse'); }
  getDescripcion() { throw new Error('getDescripcion() debe implementarse'); }
}

module.exports = { ReporteElectoral };
