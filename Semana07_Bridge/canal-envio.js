/**
 * BRIDGE — Implementador (jerarquía 1: CÓMO se envía).
 *
 * Declara el contrato que cualquier canal de envío debe cumplir.
 * No sabe nada sobre QUÉ tipo de notificación se está enviando —
 * esa es la otra dimensión, separada a propósito.
 */
class CanalEnvio {
  // [INGREDIENTE 1] IMPLEMENTOR
  enviar(destinatario, contenido) {
    throw new Error('enviar() debe implementarse');
  }
}

// [INGREDIENTE 2] CONCRETE IMPLEMENTORS
class CanalEmail extends CanalEnvio {
  enviar(destinatario, contenido) {
    return `[EMAIL -> ${destinatario}] ${contenido}`;
  }
}

class CanalSMS extends CanalEnvio {
  enviar(destinatario, contenido) {
    return `[SMS -> ${destinatario}] ${contenido.slice(0, 140)}`;
  }
}

class CanalPush extends CanalEnvio {
  enviar(destinatario, contenido) {
    return `[PUSH -> ${destinatario}] ${contenido}`;
  }
}

module.exports = { CanalEnvio, CanalEmail, CanalSMS, CanalPush };