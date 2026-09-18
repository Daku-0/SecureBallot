/**
 * PROTOTYPE — Prototipo concreto.
 *
 * Caso de aplicación elegido: una elección de alcalde. La configuración
 * de fondo (candidatos a la alcaldía, umbral de quórum, si se permite
 * voto en blanco) es una sola para toda la ciudad; lo que cambia por
 * comuna/localidad es únicamente el nombre y las mesas de votación.
 *
 * En vez de reconstruir esa configuración con el Builder (Semana05_builder)
 * cada vez que se necesita una nueva comuna, se construye UNA VEZ y se
 * clona. La copia debe ser profunda: candidatos y mesas son arrays, y un
 * clon superficial los compartiría por referencia. Si eso pasara, agregar
 * una mesa en una comuna terminaría apareciendo también en otra — el tipo
 * de bug que este patrón evita estructuralmente cuando la plataforma
 * escale a más unidades territoriales (ciudades, departamentos, país).
 */
const { Eleccion } = require('../Semana05_builder/eleccion');
const { Prototipo } = require('./prototipo');

class EleccionPrototipo extends Prototipo {
  constructor(eleccion) {
    super();
    this.eleccion = eleccion; // instancia de Eleccion (Semana05_builder), sin modificarla
  }

  clonar() {
    const datosClonados = structuredClone({
      nombre: this.eleccion.nombre,
      candidatos: this.eleccion.candidatos,
      mesas: this.eleccion.mesas,
      fechaApertura: this.eleccion.fechaApertura,
      fechaCierre: this.eleccion.fechaCierre,
      permiteVotoBlanco: this.eleccion.permiteVotoBlanco,
      umbralQuorum: this.eleccion.umbralQuorum,
    });

    const eleccionClonada = new Eleccion();
    Object.assign(eleccionClonada, datosClonados);

    return new EleccionPrototipo(eleccionClonada);
  }
}

module.exports = { EleccionPrototipo };
