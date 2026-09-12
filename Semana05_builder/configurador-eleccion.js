/**
 * BUILDER — Director.
 *
 * Conoce el ORDEN correcto de los pasos de construcción para un caso
 * de uso concreto (una elección "estándar"), pero no sabe construir
 * nada por sí mismo — delega cada paso al Builder que recibe.
 *
 * Nota de diseño: este Director no depende de EleccionBuilderEstandar
 * directamente, sino de cualquier objeto que cumpla la interfaz
 * EleccionBuilder. Así, si mañana se necesita un builder distinto
 * (por ejemplo uno para pruebas), este Director lo puede usar sin
 * cambiar ni una línea.
 */
class ConfiguradorEleccionEstandar {
  configurar(builder, datos) {
    builder.definirNombre(datos.nombre);
    datos.candidatos.forEach((c) => builder.agregarCandidato(c));
    datos.mesas.forEach((m) => builder.agregarMesa(m));
    builder.definirFechas(datos.fechaApertura, datos.fechaCierre);
    builder.permitirVotoBlanco(datos.permiteVotoBlanco);
    builder.definirQuorum(datos.umbralQuorum);
    return builder.obtenerEleccion();
  }
}

module.exports = { ConfiguradorEleccionEstandar };