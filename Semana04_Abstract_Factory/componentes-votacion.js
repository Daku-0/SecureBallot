/**
 * ABSTRACT FACTORY — Productos abstractos.
 *
 * Cada canal de votación (presencial asistido / virtual remoto) necesita
 * los mismos tres componentes, pero implementados de forma distinta.
 * Estas tres clases son el "contrato" común, igual que ReporteResultados
 * en Semana04_PFM: métodos que lanzan error si la subclase no los define.
 *
 * Importante: en ningún canal se usa papel. Ambos son electrónicos; lo
 * que cambia es el contexto (asistido en un punto de votación vs. desde
 * el propio dispositivo del votante).
 */

class Autenticador {
  /**
   * @param {object} datosVotante
   * @returns {{autenticado: boolean, canal: string, metodo: string}}
   */
  autenticar(datosVotante) {
    throw new Error('autenticar() debe ser implementado por la subclase concreta');
  }
}

class ValidadorDeVoto {
  /**
   * @param {object} datosVoto
   * @returns {{valido: boolean, canal: string, motivo?: string}}
   */
  validar(datosVoto) {
    throw new Error('validar() debe ser implementado por la subclase concreta');
  }
}

class EmisorDeComprobante {
  /**
   * @param {object} datosVoto
   * @returns {{formato: string, canal: string, contenido: string}}
   */
  emitir(datosVoto) {
    throw new Error('emitir() debe ser implementado por la subclase concreta');
  }
}

module.exports = { Autenticador, ValidadorDeVoto, EmisorDeComprobante };
