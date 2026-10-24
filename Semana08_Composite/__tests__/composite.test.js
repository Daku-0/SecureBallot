process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'admin';
process.env.DB_PASS = 'secret';
process.env.API_KEY = 'abc123';

const { ElementoElectoral, MesaVotacion, UnidadElectoral, VOTO_BLANCO } = require('../index');
const { LoggerCentralizado } = require('../../Semana03/singleton-votacion');

// Arbol de prueba: Nacional > Santander > Bucaramanga > Puesto 1 > (Mesa 1, Mesa 2)
//                                       > Floridablanca > Mesa 3
function construirArbol() {
  const mesa1 = new MesaVotacion('Mesa 1');
  const mesa2 = new MesaVotacion('Mesa 2');
  const mesa3 = new MesaVotacion('Mesa 3');
  const puesto = new UnidadElectoral('Puesto 1', 'Puesto');
  const bucaramanga = new UnidadElectoral('Bucaramanga', 'Municipio');
  const floridablanca = new UnidadElectoral('Floridablanca', 'Municipio');
  const santander = new UnidadElectoral('Santander', 'Departamento');
  const nacional = new UnidadElectoral('Colombia', 'Nacional');

  puesto.agregar(mesa1).agregar(mesa2);
  bucaramanga.agregar(puesto);
  floridablanca.agregar(mesa3);
  santander.agregar(bucaramanga).agregar(floridablanca);
  nacional.agregar(santander);
  return { nacional, santander, bucaramanga, floridablanca, puesto, mesa1, mesa2, mesa3 };
}

describe('Composite: jerarquia electoral', () => {
  test('hojas y ramas comparten el mismo contrato (Component)', () => {
    const { mesa1, nacional } = construirArbol();
    expect(mesa1).toBeInstanceOf(ElementoElectoral);
    expect(nacional).toBeInstanceOf(ElementoElectoral);
    for (const op of ['getTotalVotos', 'getTotalMesas', 'getResultados', 'todasCerradas', 'buscarMesa', 'mostrar']) {
      expect(typeof mesa1[op]).toBe('function');
      expect(typeof nacional[op]).toBe('function');
    }
  });

  test('el Component abstracto bloquea su uso directo', () => {
    const base = new ElementoElectoral('X');
    expect(() => base.getTotalVotos()).toThrow('debe implementarse');
    expect(() => new ElementoElectoral('')).toThrow();
  });

  test('una mesa cuenta votos por candidato y bloquea votos tras cerrar', () => {
    const mesa = new MesaVotacion('Mesa X');
    mesa.registrarVoto('Ana');
    mesa.registrarVoto('Ana');
    mesa.registrarVoto(VOTO_BLANCO);
    expect(mesa.getResultados()).toEqual({ Ana: 2, VOTO_BLANCO: 1 });
    expect(mesa.getTotalVotos()).toBe(3);

    mesa.cerrar();
    expect(() => mesa.registrarVoto('Ana')).toThrow('cerrada');
    expect(mesa.getTotalVotos()).toBe(3);
  });

  test('una mesa rechaza un voto sin candidato', () => {
    expect(() => new MesaVotacion('M').registrarVoto('')).toThrow('requiere un candidato');
  });

  test('la rama suma recursivamente votos y mesas de todos los niveles', () => {
    const { nacional, bucaramanga, mesa1, mesa2, mesa3 } = construirArbol();
    mesa1.registrarVoto('Ana'); mesa1.registrarVoto('Luis');
    mesa2.registrarVoto('Ana');
    mesa3.registrarVoto('Luis'); mesa3.registrarVoto('Luis');

    expect(nacional.getTotalVotos()).toBe(5);
    expect(nacional.getTotalMesas()).toBe(3);
    expect(bucaramanga.getTotalVotos()).toBe(3);
    expect(bucaramanga.getTotalMesas()).toBe(2);
  });

  test('el cliente trata igual a una mesa y al pais completo (uniformidad)', () => {
    const { nacional, mesa1 } = construirArbol();
    mesa1.registrarVoto('Ana');
    const totalDe = (elemento) => elemento.getTotalVotos(); // sin if por tipo
    expect(totalDe(mesa1)).toBe(1);
    expect(totalDe(nacional)).toBe(1);
  });

  test('consolida resultados por candidato a traves de varias ramas', () => {
    const { nacional, mesa1, mesa2, mesa3 } = construirArbol();
    mesa1.registrarVoto('Ana'); mesa2.registrarVoto('Ana'); mesa3.registrarVoto('Ana');
    mesa3.registrarVoto('Luis');
    expect(nacional.getResultados()).toEqual({ Ana: 3, Luis: 1 });
  });

  test('todasCerradas solo es true cuando TODAS las mesas del subarbol estan cerradas', () => {
    const { nacional, bucaramanga, mesa1, mesa2, mesa3 } = construirArbol();
    expect(nacional.todasCerradas()).toBe(false);

    mesa1.cerrar(); mesa2.cerrar();
    expect(bucaramanga.todasCerradas()).toBe(true);
    expect(nacional.todasCerradas()).toBe(false); // falta mesa3

    mesa3.cerrar();
    expect(nacional.todasCerradas()).toBe(true);
  });

  test('una unidad sin mesas no cuenta como cerrada', () => {
    expect(new UnidadElectoral('Vacia', 'Municipio').todasCerradas()).toBe(false);
  });

  test('buscarMesa encuentra una mesa en cualquier nivel o devuelve null', () => {
    const { nacional, mesa3 } = construirArbol();
    expect(nacional.buscarMesa('Mesa 3')).toBe(mesa3);
    expect(nacional.buscarMesa('No existe')).toBeNull();
  });

  test('impide ciclos: una unidad no puede contenerse a si misma ni a un ancestro', () => {
    const { nacional, santander, bucaramanga } = construirArbol();
    expect(() => santander.agregar(santander)).toThrow('Ciclo');
    expect(() => bucaramanga.agregar(nacional)).toThrow('Ciclo');
  });

  test('impide que un nodo tenga dos padres (evita contar votos dos veces)', () => {
    const { floridablanca, mesa1 } = construirArbol();
    expect(() => floridablanca.agregar(mesa1)).toThrow('se contarian dos veces');
  });

  test('rechaza agregar algo que no es un elemento electoral', () => {
    const { nacional } = construirArbol();
    expect(() => nacional.agregar({ getTotalVotos: () => 99 })).toThrow('Solo se pueden agregar');
  });

  test('eliminar saca el nodo, actualiza totales y permite reubicarlo', () => {
    const { nacional, floridablanca, bucaramanga, mesa3 } = construirArbol();
    mesa3.registrarVoto('Ana');
    expect(nacional.getTotalVotos()).toBe(1);

    expect(floridablanca.eliminar(mesa3)).toBe(true);
    expect(nacional.getTotalVotos()).toBe(0);
    expect(mesa3.padre).toBeNull();

    bucaramanga.agregar(mesa3); // ahora si puede ir a otro padre
    expect(nacional.getTotalVotos()).toBe(1);
    expect(floridablanca.eliminar(mesa3)).toBe(false);
  });

  test('mostrar dibuja el arbol con indentacion por nivel', () => {
    const { nacional, mesa1 } = construirArbol();
    mesa1.registrarVoto('Ana');
    const texto = nacional.mostrar();
    expect(texto.split('\n')[0]).toBe('+ Nacional: Colombia (1 votos)');
    expect(texto).toContain('      - Mesa: Mesa 1 (1 votos, abierta)');
  });

  test('cada agregar queda registrado en el LoggerCentralizado', () => {
    const antes = LoggerCentralizado.obtenerInstancia().obtenerHistorial().length;
    new UnidadElectoral('A', 'Municipio').agregar(new MesaVotacion('M'));
    const despues = LoggerCentralizado.obtenerInstancia().obtenerHistorial().length;
    expect(despues).toBe(antes + 1);
  });
});
