/**
 * BRIDGE — Refined Abstractions: cada tipo de notificacion de la
 * eleccion. Observa que NINGUNA de estas clases sabe nada sobre
 * email, SMS o push; eso lo decide quien las instancia, pasando
 * el canal como parametro.
 */
const { Notificacion } = require('./notificacion');

class NotificacionAperturaMesa extends Notificacion {
  construirContenido({ mesa, hora }) {
    return `La mesa ${mesa} abrio votacion a las ${hora}.`;
  }
}

class NotificacionResultadoPublicado extends Notificacion {
  construirContenido({ nombreEleccion, totalVotos }) {
    return `Resultados de "${nombreEleccion}" publicados. Total de votos: ${totalVotos}.`;
  }
}

class NotificacionAlertaCierre extends Notificacion {
  construirContenido({ mesa, minutosRestantes }) {
    return `Atencion: la mesa ${mesa} cierra en ${minutosRestantes} minutos.`;
  }
}

module.exports = { NotificacionAperturaMesa, NotificacionResultadoPublicado, NotificacionAlertaCierre };