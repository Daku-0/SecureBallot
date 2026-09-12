const { Eleccion } = require('../eleccion');
const { EleccionBuilder, EleccionBuilderEstandar } = require('../eleccion-builder');
const { ConfiguradorEleccionEstandar } = require('../configurador-eleccion');

describe('EleccionBuilder (abstracto)', () => {
  test('lanza error si un metodo no fue implementado por una subclase', () => {
    const builderAbstracto = new EleccionBuilder();
    expect(() => builderAbstracto.definirNombre('X')).toThrow();
    expect(() => builderAbstracto.obtenerEleccion()).toThrow();
  });
});

describe('EleccionBuilderEstandar', () => {
  test('construye una Eleccion paso a paso con los datos correctos', () => {
    const builder = new EleccionBuilderEstandar();

    builder
      .definirNombre('Prueba Unitaria')
      .agregarCandidato('Candidato A')
      .agregarCandidato('Candidato B')
      .agregarMesa('Mesa 1')
      .definirFechas('2026-01-01', '2026-01-02')
      .permitirVotoBlanco(true)
      .definirQuorum(100);

    const eleccion = builder.obtenerEleccion();

    expect(eleccion).toBeInstanceOf(Eleccion);
    expect(eleccion.nombre).toBe('Prueba Unitaria');
    expect(eleccion.candidatos).toEqual(['Candidato A', 'Candidato B']);
    expect(eleccion.mesas).toEqual(['Mesa 1']);
    expect(eleccion.permiteVotoBlanco).toBe(true);
    expect(eleccion.umbralQuorum).toBe(100);
  });

  test('cada llamada al builder devuelve "this", permitiendo encadenar', () => {
    const builder = new EleccionBuilderEstandar();
    const resultado = builder.definirNombre('X');
    expect(resultado).toBe(builder);
  });
});

describe('ConfiguradorEleccionEstandar (Director)', () => {
  test('arma una Eleccion completa a partir de un objeto de datos', () => {
    const director = new ConfiguradorEleccionEstandar();
    const builder = new EleccionBuilderEstandar();

    const eleccion = director.configurar(builder, {
      nombre: 'Eleccion de Prueba',
      candidatos: ['Ana', 'Luis'],
      mesas: ['Mesa 1', 'Mesa 2'],
      fechaApertura: '2026-09-04T08:00',
      fechaCierre: '2026-09-04T17:00',
      permiteVotoBlanco: false,
      umbralQuorum: 200,
    });

    expect(eleccion.nombre).toBe('Eleccion de Prueba');
    expect(eleccion.candidatos).toHaveLength(2);
    expect(eleccion.mesas).toHaveLength(2);
    expect(eleccion.umbralQuorum).toBe(200);
  });

  test('el Director funciona con cualquier builder que cumpla la interfaz (DIP)', () => {
    // Builder alterno minimo, solo para esta prueba, que cumple el
    // mismo contrato que EleccionBuilder pero no hereda de nadie.
    class BuilderFalso {
      constructor() { this.pasos = []; }
      definirNombre(n) { this.pasos.push('nombre'); return this; }
      agregarCandidato(c) { this.pasos.push('candidato'); return this; }
      agregarMesa(m) { this.pasos.push('mesa'); return this; }
      definirFechas(a, c) { this.pasos.push('fechas'); return this; }
      permitirVotoBlanco(p) { this.pasos.push('votoBlanco'); return this; }
      definirQuorum(q) { this.pasos.push('quorum'); return this; }
      obtenerEleccion() { return { pasosEjecutados: this.pasos }; }
    }

    const director = new ConfiguradorEleccionEstandar();
    const resultado = director.configurar(new BuilderFalso(), {
      nombre: 'X', candidatos: ['A'], mesas: ['M1'],
      fechaApertura: '2026-01-01', fechaCierre: '2026-01-02',
      permiteVotoBlanco: true, umbralQuorum: 1,
    });

    expect(resultado.pasosEjecutados).toEqual([
      'nombre', 'candidato', 'mesa', 'fechas', 'votoBlanco', 'quorum',
    ]);
  });
});