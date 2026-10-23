/**
 * ADAPTER — Target (la interfaz que SecureBallot espera).
 *
 * El resto del sistema (el proceso de votación) habla con esta
 * interfaz, SIN saber nada del servicio externo real que valida
 * identidad. Mañana ese servicio externo podría cambiar de
 * proveedor y este contrato no se mueve.
 */
class VerificadorIdentidad {
  // [INGREDIENTE 1] TARGET: el contrato que el cliente conoce
  verificar(documento) {
    throw new Error('verificar() debe implementarse');
  }
}

module.exports = { VerificadorIdentidad };