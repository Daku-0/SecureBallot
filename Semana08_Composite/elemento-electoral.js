/**
 * COMPOSITE — Component.
 *
 * Contrato comun para las HOJAS (MesaVotacion) y las RAMAS
 * (UnidadElectoral: pais, departamento, municipio, puesto de votacion).
 * El cliente consolida votos de una mesa o de todo el pais con la
 * misma llamada, sin preguntar de que tipo de nodo se trata.
 *
 * Variante "segura": agregar()/eliminar() NO estan aqui, solo en la
 * rama, porque una mesa no puede tener hijos.
 */
class ElementoElectoral {
  constructor(nombre) {
    if (!nombre) throw new Error('El elemento electoral requiere un nombre');
    this.nombre = nombre;
    this._padre = null;
  }

  get padre() { return this._padre; }

  // Uso interno: lo invoca la rama al agregar/eliminar un hijo.
  _asignarPadre(padre) { this._padre = padre; }

  // [INGREDIENTE 1] COMPONENT: operaciones que toda hoja o rama debe cumplir
  getTotalVotos() { throw new Error('getTotalVotos() debe implementarse'); }
  getTotalMesas() { throw new Error('getTotalMesas() debe implementarse'); }
  getResultados() { throw new Error('getResultados() debe implementarse'); }
  todasCerradas() { throw new Error('todasCerradas() debe implementarse'); }
  buscarMesa(nombre) { throw new Error('buscarMesa() debe implementarse'); }
  mostrar(indentacion = '') { throw new Error('mostrar() debe implementarse'); }
}

module.exports = { ElementoElectoral };
