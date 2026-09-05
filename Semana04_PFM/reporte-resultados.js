/**
 * FACTORY METHOD — Punto elegido: generación de reportes/actas de
 * resultados electorales en distintos formatos.
 *
 * ¿Por qué este punto y no otro?
 *  - SecureBallot necesita entregar los resultados de una elección a
 *    audiencias distintas con requisitos distintos:
 *      * El acta oficial normalmente se firma/archiva como PDF.
 *      * Los organismos de auditoría o de datos abiertos piden CSV.
 *      * Un futuro panel en tiempo real necesitaría JSON.
 *  - Es un sistema de VOTACIÓN: la trazabilidad y la posibilidad de
 *    auditar cada formato de salida (sin tocar la lógica de conteo)
 *    es un requisito real, no inventado.
 *  - Cada formato nuevo NO debería obligar a tocar el código que ya
 *    genera PDF o CSV: ahí es exactamente donde Factory Method aporta,
 *    a diferencia de, por ejemplo, un mecanismo de autenticación, donde
 *    la variación de "creación de objetos" es mucho más pequeña.
 *
 * ---------------------------------------------------------------
 * [INGREDIENTE 1] PRODUCTO (abstracción)
 * ---------------------------------------------------------------
 * En Java esto sería una interfaz o clase abstracta. JavaScript no
 * tiene ninguna de las dos de forma nativa, así que se simula con una
 * clase base cuyos métodos lanzan un error si no fueron sobrescritos.
 * Esto documenta el "contrato" y falla rápido si alguien olvida
 * implementarlo, que es el objetivo de una interfaz en Java.
 */
class ReporteResultados {
  /**
   * Operación común que TODOS los productos concretos deben implementar.
   * @param {object} datosEleccion
   * @returns {{formato: string, contenido: string}}
   */
  generar(datosEleccion) {
    throw new Error('generar() debe ser implementado por la subclase concreta');
  }

  /** Extensión de archivo asociada al formato (usada al exportar). */
  extension() {
    throw new Error('extension() debe ser implementado por la subclase concreta');
  }
}

/**
 * ---------------------------------------------------------------
 * [INGREDIENTE 2] PRODUCTOS CONCRETOS
 * ---------------------------------------------------------------
 */
class ReporteResultadosPDF extends ReporteResultados {
  generar(datosEleccion) {
    this.#validar(datosEleccion);
    const totalVotos = datosEleccion.resultados.reduce((acc, r) => acc + r.votos, 0);

    const lineas = [
      'ACTA DE ESCRUTINIO (formato PDF - representación textual)',
      `Elección: ${datosEleccion.nombreEleccion}`,
      `Fecha: ${datosEleccion.fecha}`,
      '----------------------------------------',
      ...datosEleccion.resultados.map((r) => `${r.candidato}: ${r.votos} votos`),
      '----------------------------------------',
      `Total de votos: ${totalVotos}`,
    ];

    return { formato: 'pdf', contenido: lineas.join('\n') };
  }

  extension() {
    return 'pdf';
  }

  #validar(datosEleccion) {
    if (!datosEleccion || !Array.isArray(datosEleccion.resultados)) {
      throw new Error('Datos de elección inválidos para generar el reporte');
    }
  }
}

class ReporteResultadosCSV extends ReporteResultados {
  generar(datosEleccion) {
    this.#validar(datosEleccion);
    const encabezado = 'candidato,votos';
    const filas = datosEleccion.resultados.map((r) => `${r.candidato},${r.votos}`);

    return { formato: 'csv', contenido: [encabezado, ...filas].join('\n') };
  }

  extension() {
    return 'csv';
  }

  #validar(datosEleccion) {
    if (!datosEleccion || !Array.isArray(datosEleccion.resultados)) {
      throw new Error('Datos de elección inválidos para generar el reporte');
    }
  }
}

module.exports = {
  ReporteResultados,
  ReporteResultadosPDF,
  ReporteResultadosCSV,
};
