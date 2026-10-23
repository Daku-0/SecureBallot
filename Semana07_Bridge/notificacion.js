/**
 * BRIDGE — Abstraccion (jerarquia 2: QUE se notifica).
 *
 * No hereda del canal, lo RECIBE por composicion (el "puente").
 * Esto es lo que permite combinar cualquier tipo de notificacion
 * con cualquier canal sin que exista una clase para cada combinacion.
 */
const { LoggerCentralizado } = require('../Semana03/singleton-votacion');

class Notificacion {
  constructor(canal) {
    // [INGREDIENTE 3] el puente: la abstraccion GUARDA un implementador
    this.canal = canal;
  }

  // Metodo que las subclases (RefinedAbstraction) sobrescriben para
  // armar el contenido especifico de cada tipo de notificacion.
  construirContenido(datos) {
    throw new Error('construirContenido() debe implementarse');
  }

  enviar(destinatario, datos) {
    const contenido = this.construirContenido(datos);
    const resultado = this.canal.enviar(destinatario, contenido);

    LoggerCentralizado.obtenerInstancia().registrar(
      'INFO',
      'Notificacion enviada',
      { tipo: this.constructor.name, canal: this.canal.constructor.name, destinatario }
    );

    return resultado;
  }
}

module.exports = { Notificacion };