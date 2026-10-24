process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'admin';
process.env.DB_PASS = 'secret';
process.env.API_KEY = 'abc123';

const { Candidato, FabricaCandidatos, Tarjeton } = require('../index');
const { LoggerCentralizado } = require('../../Semana03/singleton-votacion');

const CATALOGO = {
  C1: { nombre: 'Ana Perez', partido: 'Partido Verde', propuesta: 'Movilidad y educacion' },
  C2: { nombre: 'Luis Gomez', partido: 'Partido Azul', propuesta: 'Salud y empleo' },
  C3: { nombre: 'Carla Rios', partido: 'Partido Rojo', propuesta: 'Seguridad' },
};

function fabricaConConteo() {
  const llamadas = [];
  const fabrica = new FabricaCandidatos((codigo) => { llamadas.push(codigo); return CATALOGO[codigo] || null; });
  return { fabrica, llamadas };
}

describe('Flyweight: catalogo compartido de candidatos', () => {
  test('el mismo codigo devuelve exactamente la misma instancia', () => {
    const { fabrica } = fabricaConConteo();
    expect(fabrica.getCandidato('C1')).toBe(fabrica.getCandidato('C1'));
    expect(fabrica.getCandidato('C1')).not.toBe(fabrica.getCandidato('C2'));
  });

  test('miles de opciones de tarjeton comparten pocas instancias', () => {
    const { fabrica } = fabricaConConteo();
    const tarjetones = [];
    for (let m = 0; m < 500; m++) tarjetones.push(new Tarjeton(`Mesa ${m}`, ['C1', 'C2', 'C3'], fabrica));

    const totalOpciones = tarjetones.reduce((s, t) => s + t.opciones.length, 0);
    expect(totalOpciones).toBe(1500);
    expect(fabrica.getTotalInstancias()).toBe(3);
    expect(tarjetones[0].opciones[0].candidato).toBe(tarjetones[499].opciones[0].candidato);
  });

  test('consulta el origen de datos una sola vez por codigo', () => {
    const { fabrica, llamadas } = fabricaConConteo();
    fabrica.getCandidato('C1'); fabrica.getCandidato('C1'); fabrica.getCandidato('C2'); fabrica.getCandidato('C1');
    expect(llamadas).toEqual(['C1', 'C2']);
  });

  test('el Flyweight es inmutable: no se puede alterar para todas las mesas a la vez', () => {
    const { fabrica } = fabricaConConteo();
    const c = fabrica.getCandidato('C1');
    expect(Object.isFrozen(c)).toBe(true);
    try { c.nombre = 'Otro'; } catch (e) { /* en modo estricto lanza; en modo laxo se ignora */ }
    expect(c.nombre).toBe('Ana Perez');
  });

  test('el estado extrinseco (posicion, mesa) NO vive en el Flyweight', () => {
    const { fabrica } = fabricaConConteo();
    const t1 = new Tarjeton('Mesa 1', ['C1', 'C2'], fabrica);
    const t2 = new Tarjeton('Mesa 2', ['C2', 'C1'], fabrica);

    expect(Object.keys(fabrica.getCandidato('C1')).sort()).toEqual(['codigo', 'nombre', 'partido', 'propuesta']);
    // Mismo candidato compartido, distinta posicion segun el tarjeton
    expect(t1.opciones[0].candidato).toBe(t2.opciones[1].candidato);
    expect(t1.opciones[0].posicion).toBe(1);
    expect(t2.opciones[1].posicion).toBe(2);
  });

  test('mostrar combina el estado intrinseco con el extrinseco recibido por parametro', () => {
    const { fabrica } = fabricaConConteo();
    expect(fabrica.getCandidato('C2').mostrar(3, 'Mesa 9')).toBe('[Mesa 9] 3. Luis Gomez (Partido Azul) - Cod. C2');
    const t = new Tarjeton('Mesa 4', ['C1', 'C3'], fabrica);
    expect(t.mostrar()).toBe('[Mesa 4] 1. Ana Perez (Partido Verde) - Cod. C1\n[Mesa 4] 2. Carla Rios (Partido Rojo) - Cod. C3');
  });

  test('un codigo inexistente falla y no queda guardado en el cache', () => {
    const { fabrica } = fabricaConConteo();
    expect(() => fabrica.getCandidato('C99')).toThrow('no existe');
    expect(fabrica.getTotalInstancias()).toBe(0);
  });

  test('un tarjeton no admite candidatos repetidos, vacios ni mesa ausente', () => {
    const { fabrica } = fabricaConConteo();
    expect(() => new Tarjeton('M', ['C1', 'C1'], fabrica)).toThrow('dos veces');
    expect(() => new Tarjeton('M', [], fabrica)).toThrow('al menos un candidato');
    expect(() => new Tarjeton('', ['C1'], fabrica)).toThrow('requiere una mesa');
  });

  test('solo la creacion de un Flyweight queda auditada, no cada reutilizacion', () => {
    const { fabrica } = fabricaConConteo();
    const antes = LoggerCentralizado.obtenerInstancia().obtenerHistorial().length;
    fabrica.getCandidato('C1'); fabrica.getCandidato('C1'); fabrica.getCandidato('C1');
    const despues = LoggerCentralizado.obtenerInstancia().obtenerHistorial().length;
    expect(despues).toBe(antes + 1);
  });

  test('la fabrica exige un origen de datos y Candidato es de la clase esperada', () => {
    expect(() => new FabricaCandidatos()).toThrow('origenDatos');
    const { fabrica } = fabricaConConteo();
    expect(fabrica.getCandidato('C1')).toBeInstanceOf(Candidato);
  });
});
