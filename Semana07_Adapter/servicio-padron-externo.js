/**
 * ADAPTER — Adaptee.
 *
 * Simula una API externa real (ej. el padrón electoral de la
 * Registraduría) que SecureBallot NO controla ni puede modificar.
 * Nota que su firma es completamente distinta a lo que espera
 * VerificadorIdentidad: otros nombres de método, otra forma de
 * devolver el resultado (status/data en vez de valido/nombre).
 */
class ServicioPadronExterno {
  consultarCedula(cedula) {
    // Simulación: cédulas que empiezan en "9" no existen en el padrón
    if (String(cedula).startsWith('9')) {
      return { status: 'NOT_FOUND', data: null, errorCode: 404 };
    }
    return {
      status: 'OK',
      data: { nombreCompleto: `Ciudadano ${cedula}`, habilitado: true },
      errorCode: null,
    };
  }
}

module.exports = { ServicioPadronExterno };