/**
 * ABSTRACT FACTORY — Fábrica abstracta.
 *
 * Declara UNA familia completa de componentes relacionados. A diferencia
 * del Factory Method (Semana04_PFM), donde el Creador expone un único
 * método de creación, aquí hay tres métodos que deben devolver productos
 * de la MISMA familia (mismo canal). El código cliente nunca llama a
 * "new AutenticadorPresencial()" directamente: solo conoce esta interfaz.
 */
class FabricaCanalVotacion {
  crearAutenticador() {
    throw new Error('crearAutenticador() debe ser implementado por la fábrica concreta');
  }

  crearValidadorDeVoto() {
    throw new Error('crearValidadorDeVoto() debe ser implementado por la fábrica concreta');
  }

  crearEmisorDeComprobante() {
    throw new Error('crearEmisorDeComprobante() debe ser implementado por la fábrica concreta');
  }
}

module.exports = { FabricaCanalVotacion };
