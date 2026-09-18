const { Eleccion } = require('../../Semana05_builder/eleccion');
const { EleccionBuilderEstandar, ConfiguradorEleccionEstandar } = require('../../Semana05_builder');
const { Prototipo } = require('../prototipo');
const { EleccionPrototipo } = require('../eleccion-prototipo');
const { RegistroPlantillasEleccion } = require('../registro-plantillas');

function construirMaestra() {
  const director = new ConfiguradorEleccionEstandar();
  return director.configurar(new EleccionBuilderEstandar(), {
    nombre: 'Elección de Alcalde de Prueba',
    candidatos: ['Candidato A', 'Candidato B'],
    mesas: [],
    fechaApertura: '2026-01-01T08:00',
    fechaCierre: '2026-01-01T17:00',
    permiteVotoBlanco: true,
    umbralQuorum: 100,
  });
}

describe('Prototipo (abstracto)', () => {
  test('lanza error si un prototipo concreto no implementa clonar()', () => {
    const prototipoAbstracto = new Prototipo();
    expect(() => prototipoAbstracto.clonar()).toThrow();
  });
});

describe('EleccionPrototipo — clonación profunda', () => {
  test('el clon es una instancia independiente de Eleccion, no la misma referencia', () => {
    const maestra = construirMaestra();
    const prototipo = new EleccionPrototipo(maestra);
    const clon = prototipo.clonar();

    expect(clon).toBeInstanceOf(EleccionPrototipo);
    expect(clon.eleccion).toBeInstanceOf(Eleccion);
    expect(clon.eleccion).not.toBe(maestra);
    expect(clon.eleccion.nombre).toBe(maestra.nombre);
  });

  test('modificar las mesas de un clon no afecta a la maestra (deep clone)', () => {
    const maestra = construirMaestra();
    const prototipo = new EleccionPrototipo(maestra);
    const clon = prototipo.clonar();

    clon.eleccion.mesas.push('Mesa Nueva');

    expect(clon.eleccion.mesas).toEqual(['Mesa Nueva']);
    expect(maestra.mesas).toEqual([]);
  });

  test('dos clones de la misma plantilla no comparten arrays entre sí', () => {
    const maestra = construirMaestra();
    const prototipo = new EleccionPrototipo(maestra);
    const clonA = prototipo.clonar();
    const clonB = prototipo.clonar();

    clonA.eleccion.mesas.push('Mesa Comuna A');
    clonB.eleccion.mesas.push('Mesa Comuna B');

    expect(clonA.eleccion.mesas).toEqual(['Mesa Comuna A']);
    expect(clonB.eleccion.mesas).toEqual(['Mesa Comuna B']);
    expect(clonA.eleccion.mesas).not.toBe(clonB.eleccion.mesas);
  });

  test('modificar los candidatos de un clon no afecta a la maestra', () => {
    const maestra = construirMaestra();
    const prototipo = new EleccionPrototipo(maestra);
    const clon = prototipo.clonar();

    clon.eleccion.candidatos.push('Candidato C');

    expect(clon.eleccion.candidatos).toHaveLength(3);
    expect(maestra.candidatos).toHaveLength(2);
  });
});

describe('RegistroPlantillasEleccion', () => {
  test('obtenerClon() devuelve un clon nuevo en cada llamada', () => {
    const maestra = construirMaestra();
    const registro = new RegistroPlantillasEleccion();
    registro.registrar('alcaldia-prueba', new EleccionPrototipo(maestra));

    const clon1 = registro.obtenerClon('alcaldia-prueba');
    const clon2 = registro.obtenerClon('alcaldia-prueba');

    expect(clon1).not.toBe(clon2);
    expect(clon1.eleccion).not.toBe(clon2.eleccion);
  });

  test('lanza error si se pide un clon de una plantilla no registrada', () => {
    const registro = new RegistroPlantillasEleccion();
    expect(() => registro.obtenerClon('no-existe')).toThrow();
  });
});
