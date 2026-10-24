/**
 * PROXY — Subject.
 *
 * Interfaz comun del servicio de resultados. El servicio real y TODOS los
 * proxies la cumplen, asi que el cliente no sabe con cual esta hablando.
 */
class ServicioResultados {
  // [INGREDIENTE 1] SUBJECT
  consultar() { throw new Error('consultar() debe implementarse'); }
}

module.exports = { ServicioResultados };
