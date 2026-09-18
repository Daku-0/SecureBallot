/**
 * Prueba de integración: Builder → Prototype → Abstract Factory → Factory Method.
 *
 * Cada patrón ya tiene su propia suite unitaria (Semana03, Semana04_PFM,
 * Semana04_Abstract_Factory, Semana05_Prototype). Esta suite prueba
 * específicamente el "cableado" entre ellos: que la salida de un patrón
 * sea una entrada válida del siguiente y que los datos de dominio
 * (candidato, mesa, votos) se conserven exactos en el camino, no solo
 * que las llamadas no truenen.
 *
 * Deliberadamente NO hay una prueba de "Builder → Prototype" aquí: esa
 * garantía (el clon es una instancia real de Eleccion, independiente de
 * la maestra) ya está cubierta por completo en prototype.test.js. Repetirla
 * en este archivo sería un test unitario disfrazado de integración.
 *
 * Importante sobre lo que se prueba y lo que no:
 *  - Prototype → Abstract Factory: ValidadorDeVotoPresencial solo exige
 *    que candidato/mesa sean valores truthy, no verifica que provengan
 *    de la Eleccion de origen. La integración real es de tipo (ambos son
 *    string); por eso se verifica que el valor exacto tomado del clon
 *    llegue intacto hasta el comprobante, y que la maestra (que nunca
 *    tuvo mesas) siga sin ellas — si el clon no fuera independiente, la
 *    mutación de sus mesas se habría filtrado hacia la maestra.
 *  - Prototype → Factory Method: no existe una conversión automática de
 *    Eleccion a la forma que espera GeneradorReporte (nombreEleccion,
 *    fecha, resultados con conteo de votos). Es un mapeo manual del
 *    cliente, no un contrato entre clases. Se prueba como tal.
 */
const { LoggerCentralizado } = require('../../Semana03/singleton-votacion');
const { GeneradorReportePDF } = require('../../Semana04_PFM/generador-reporte');
const { FabricaVotacionPresencial } = require('../../Semana04_Abstract_Factory/canal-presencial');
const { EleccionBuilderEstandar, ConfiguradorEleccionEstandar } = require('../../Semana05_builder');
const { EleccionPrototipo, RegistroPlantillasEleccion } = require('../index');

function construirMaestra() {
  const director = new ConfiguradorEleccionEstandar();
  return director.configurar(new EleccionBuilderEstandar(), {
    nombre: 'Elección de Alcalde de Integración',
    candidatos: ['Ana Torres', 'Luis Gómez'],
    mesas: [],
    fechaApertura: '2026-10-25T08:00',
    fechaCierre: '2026-10-25T17:00',
    permiteVotoBlanco: true,
    umbralQuorum: 50000,
  });
}

describe('Integración: Prototype → Abstract Factory', () => {
  test('un candidato y una mesa tomados del clon son aceptados como voto válido y llegan intactos al comprobante', () => {
    const maestra = construirMaestra();
    const registro = new RegistroPlantillasEleccion();
    registro.registrar('alcaldia', new EleccionPrototipo(maestra));

    const comuna1 = registro.obtenerClon('alcaldia');
    comuna1.eleccion.mesas.push('Mesa C1-01', 'Mesa C1-02');

    const fabrica = new FabricaVotacionPresencial();
    const datosVotante = { identificacion: 'CC-9001', verificadoPorEncargado: true };
    const datosVoto = {
      candidato: comuna1.eleccion.candidatos[0],
      mesa: comuna1.eleccion.mesas[1],
    };

    expect(fabrica.crearAutenticador().autenticar(datosVotante).autenticado).toBe(true);
    expect(fabrica.crearValidadorDeVoto().validar(datosVoto).valido).toBe(true);

    const comprobante = fabrica.crearEmisorDeComprobante().emitir(datosVoto);

    expect(comprobante.contenido).toContain(comuna1.eleccion.candidatos[0]);
    expect(comprobante.contenido).toContain('Mesa C1-02');
    // La maestra nunca tuvo mesas: si el clon compartiera el array por
    // referencia, el push de arriba habría terminado apareciendo aquí.
    expect(maestra.mesas).toEqual([]);
  });
});

describe('Integración: Prototype → Factory Method', () => {
  test('mapear un clon a datosEleccion produce un reporte con el nombre y los votos exactos de esa comuna', () => {
    const maestra = construirMaestra();
    const registro = new RegistroPlantillasEleccion();
    registro.registrar('alcaldia', new EleccionPrototipo(maestra));

    const comuna1 = registro.obtenerClon('alcaldia');
    comuna1.eleccion.nombre += ' — Comuna 1';

    // Mapeo manual: Eleccion no tiene la forma que espera GeneradorReporte,
    // así que el cliente arma resultados a partir de los candidatos del clon.
    const resultados = comuna1.eleccion.candidatos.map((candidato, i) => ({
      candidato,
      votos: i === 0 ? 340 : 298,
    }));

    const reporte = new GeneradorReportePDF().generarReporteOficial({
      nombreEleccion: comuna1.eleccion.nombre,
      fecha: comuna1.eleccion.fechaCierre,
      resultados,
    });

    expect(reporte.contenido).toContain('Elección de Alcalde de Integración — Comuna 1');
    expect(reporte.contenido).toContain(`${comuna1.eleccion.candidatos[0]}: 340 votos`);
    expect(reporte.contenido).toContain(`${comuna1.eleccion.candidatos[1]}: 298 votos`);
    expect(reporte.contenido).toContain('Total de votos: 638');
  });
});

describe('Integración completa: Builder → Prototype → Abstract Factory → Factory Method', () => {
  test('procesar un voto y generar el reporte de una comuna no afecta a otra ni a la maestra, y queda auditado', () => {
    const maestra = construirMaestra();
    const registro = new RegistroPlantillasEleccion();
    registro.registrar('alcaldia', new EleccionPrototipo(maestra));

    const comuna1 = registro.obtenerClon('alcaldia');
    comuna1.eleccion.mesas.push('Mesa C1-01');
    const comuna2 = registro.obtenerClon('alcaldia');
    comuna2.eleccion.mesas.push('Mesa C2-01');

    const fabrica = new FabricaVotacionPresencial();
    const datosVoto = { candidato: comuna1.eleccion.candidatos[0], mesa: comuna1.eleccion.mesas[0] };
    fabrica.crearAutenticador().autenticar({ identificacion: 'CC-1', verificadoPorEncargado: true });
    const comprobante = fabrica.crearEmisorDeComprobante().emitir(datosVoto);

    const logger = LoggerCentralizado.obtenerInstancia();
    const cantidadAntes = logger.obtenerHistorial().length;
    logger.registrarVoto('voto-anon-integracion', datosVoto.mesa);

    const resultados = comuna1.eleccion.candidatos.map((candidato, i) => ({ candidato, votos: i === 0 ? 1 : 0 }));
    const reporte = new GeneradorReportePDF().generarReporteOficial({
      nombreEleccion: comuna1.eleccion.nombre,
      fecha: comuna1.eleccion.fechaCierre,
      resultados,
    });

    // El comprobante generado en el flujo combinado sigue siendo el de
    // Comuna 1, nunca el de Comuna 2 (antes se llamaba a emitir() sin
    // verificar el resultado).
    expect(comprobante.contenido).toContain('Mesa C1-01');
    expect(comprobante.contenido).not.toContain('Mesa C2-01');

    // Coexistencia: procesar Comuna 1 de punta a punta no afecta a Comuna 2 ni a la maestra.
    expect(comuna2.eleccion.mesas).toEqual(['Mesa C2-01']);
    expect(maestra.mesas).toEqual([]);

    // Auditoría: el flujo combinado (voto + reporte) deja exactamente las
    // entradas esperadas en el Singleton, con la cadena de hashes íntegra.
    expect(reporte.contenido).toContain('Total de votos: 1');
    expect(logger.obtenerHistorial().length).toBe(cantidadAntes + 2); // voto emitido + reporte generado
    expect(logger.verificarIntegridad()).toBe(true);
  });
});
