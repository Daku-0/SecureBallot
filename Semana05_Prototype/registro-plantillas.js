/**
 * PROTOTYPE — Registro de plantillas (Prototype Manager).
 *
 * El código cliente nunca construye una Eleccion nueva desde cero para
 * cada comuna: pide un clon de la plantilla ya registrada. Esta clase es
 * la única que sabe qué plantillas existen; el cliente solo conoce
 * nombres, nunca instancias concretas de Eleccion.
 */
class RegistroPlantillasEleccion {
  #plantillas = new Map();

  registrar(nombre, prototipo) {
    this.#plantillas.set(nombre, prototipo);
  }

  obtenerClon(nombre) {
    const prototipo = this.#plantillas.get(nombre);
    if (!prototipo) {
      throw new Error(`No existe una plantilla registrada como "${nombre}"`);
    }
    return prototipo.clonar();
  }
}

module.exports = { RegistroPlantillasEleccion };
