/**
 * PROXY — RealSubject.
 *
 * Consolida los resultados de toda la jerarquia (Composite). Es la
 * operacion "costosa y sensible": recorre todo el arbol y entrega el
 * consolidado oficial. No sabe nada de roles ni de cache.
 */
const { ServicioResultados } = require('./servicio-resultados');
const { VOTO_BLANCO } = require('../Semana08_Composite/mesa-votacion');
const { LoggerCentralizado } = require('../Semana03/singleton-votacion');

class ServicioResultadosReal extends ServicioResultados {
  // [INGREDIENTE 2] REAL SUBJECT
  constructor(raiz) {
    super();
    this.raiz = raiz;
  }

  consultar() {
    const votosPorCandidato = this.raiz.getResultados();

    // El ganador se decide entre candidatos: el voto en blanco no gana
    const candidatos = Object.entries(votosPorCandidato)
      .filter(([nombre]) => nombre !== VOTO_BLANCO)
      .sort(([, a], [, b]) => b - a);
    let ganador = null;
    if (candidatos.length > 0) {
      const empate = candidatos.length > 1 && candidatos[0][1] === candidatos[1][1];
      ganador = empate ? 'EMPATE' : candidatos[0][0];
    }

    LoggerCentralizado.obtenerInstancia().registrar('INFO', 'Resultados consolidados', {
      totalVotos: this.raiz.getTotalVotos(),
    });

    // Objeto congelado: si se comparte desde el cache nadie puede alterarlo
    return Object.freeze({
      totalVotos: this.raiz.getTotalVotos(),
      totalMesas: this.raiz.getTotalMesas(),
      votosPorCandidato: Object.freeze({ ...votosPorCandidato }),
      ganador,
    });
  }
}

module.exports = { ServicioResultadosReal };
