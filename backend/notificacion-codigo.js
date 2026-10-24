/**
 * Un tipo de notificacion NUEVO agregado al Bridge sin modificar ninguna
 * clase de la Semana 7 (Open/Closed): solo hereda de Notificacion y define
 * su contenido. Funciona con cualquier canal (SMS, email, push).
 */
const { Notificacion } = require('../Semana07_Bridge/notificacion');

class NotificacionCodigoVerificacion extends Notificacion {
  construirContenido({ codigo, minutos }) {
    return `Tu codigo de verificacion de SecureBallot es ${codigo}. Vence en ${minutos} minutos.`;
  }
}

module.exports = { NotificacionCodigoVerificacion };
