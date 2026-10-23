const { CanalEnvio, CanalEmail, CanalSMS, CanalPush } = require('./canal-envio');
const { Notificacion } = require('./notificacion');
const { NotificacionAperturaMesa, NotificacionResultadoPublicado, NotificacionAlertaCierre } = require('./tipos-notificacion');

module.exports = {
  CanalEnvio, CanalEmail, CanalSMS, CanalPush,
  Notificacion,
  NotificacionAperturaMesa, NotificacionResultadoPublicado, NotificacionAlertaCierre,
};