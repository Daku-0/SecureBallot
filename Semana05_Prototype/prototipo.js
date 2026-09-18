/**
 * PROTOTYPE — Prototipo abstracto.
 *
 * Declara el contrato que debe cumplir cualquier objeto clonable: un
 * método clonar() que devuelve una copia independiente de sí mismo.
 * Igual que ReporteResultados o EleccionBuilder en semanas anteriores,
 * se simula la interfaz con una clase base cuyo método lanza error si
 * la subclase no lo implementa.
 */
class Prototipo {
  clonar() {
    throw new Error('clonar() debe ser implementado por el prototipo concreto');
  }
}

module.exports = { Prototipo };
