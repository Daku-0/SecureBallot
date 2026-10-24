process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'admin';
process.env.DB_PASS = 'secret';
process.env.API_KEY = 'abc123';

const {
  ServicioResultados, ServicioResultadosReal,
  ProxyVirtualResultados, ProxyCacheResultados, ProxyProteccionResultados,
  ErrorAccesoResultados, crearServicioResultados,
} = require('../index');
const { UnidadElectoral, MesaVotacion, VOTO_BLANCO } = require('../../Semana08_Composite');
const { LoggerCentralizado } = require('../../Semana03/singleton-votacion');

const historial = () => LoggerCentralizado.obtenerInstancia().obtenerHistorial();

// Mesa 1: Ana x3, Luis x1 | Mesa 2: Ana x1, Luis x2, blanco x1  =>  Ana 4, Luis 3, blanco 1
function escenario() {
  const mesa1 = new MesaVotacion('Mesa 1');
  const mesa2 = new MesaVotacion('Mesa 2');
  ['Ana', 'Ana', 'Ana', 'Luis'].forEach((c) => mesa1.registrarVoto(c));
  ['Ana', 'Luis', 'Luis', VOTO_BLANCO].forEach((c) => mesa2.registrarVoto(c));
  const raiz = new UnidadElectoral('Bucaramanga', 'Municipio');
  raiz.agregar(mesa1).agregar(mesa2);
  return { raiz, mesa1, mesa2 };
}

function cerrarTodo({ mesa1, mesa2 }) { mesa1.cerrar(); mesa2.cerrar(); }

// Servicio "espia": cuenta cuantas veces se pidio trabajo real
function servicioEspia(raiz) {
  const real = new ServicioResultadosReal(raiz);
  const espia = { creados: 0, consultas: 0 };
  const crear = () => {
    espia.creados++;
    return { consultar: () => { espia.consultas++; return real.consultar(); } };
  };
  return { crear, espia };
}

describe('Proxy: servicio de resultados', () => {
  test('el servicio real consolida los resultados de todo el Composite', () => {
    const { raiz } = escenario();
    const r = new ServicioResultadosReal(raiz).consultar();
    expect(r.totalVotos).toBe(8);
    expect(r.totalMesas).toBe(2);
    expect(r.votosPorCandidato).toEqual({ Ana: 4, Luis: 3, VOTO_BLANCO: 1 });
    expect(r.ganador).toBe('Ana');
  });

  test('el ganador ignora el voto en blanco y detecta empates', () => {
    const mesa = new MesaVotacion('M');
    for (let i = 0; i < 5; i++) mesa.registrarVoto(VOTO_BLANCO);
    mesa.registrarVoto('Ana');
    const raiz = new UnidadElectoral('R', 'Municipio').agregar(mesa);
    expect(new ServicioResultadosReal(raiz).consultar().ganador).toBe('Ana');

    mesa.registrarVoto('Luis');
    expect(new ServicioResultadosReal(raiz).consultar().ganador).toBe('EMPATE');

    expect(new ServicioResultadosReal(new UnidadElectoral('Vacia')).consultar().ganador).toBeNull();
  });

  test('real y proxies cumplen la misma interfaz (Subject)', () => {
    const { raiz } = escenario();
    const cadena = crearServicioResultados({ raiz, usuario: 'u', rol: 'AUDITOR' });
    for (const s of [new ServicioResultadosReal(raiz), cadena,
      new ProxyVirtualResultados(() => new ServicioResultadosReal(raiz)),
      new ProxyCacheResultados(new ServicioResultadosReal(raiz))]) {
      expect(s).toBeInstanceOf(ServicioResultados);
    }
    expect(() => new ServicioResultados().consultar()).toThrow('debe implementarse');
  });

  describe('Protection Proxy', () => {
    test('un VOTANTE es denegado y el servicio real ni siquiera se crea', () => {
      const e = escenario(); cerrarTodo(e);
      const { crear, espia } = servicioEspia(e.raiz);
      const proxy = new ProxyProteccionResultados(new ProxyVirtualResultados(crear), { usuario: 'v1', rol: 'VOTANTE' },
        { eleccionCerrada: () => e.raiz.todasCerradas() });

      expect.assertions(3);
      expect(() => proxy.consultar()).toThrow(ErrorAccesoResultados);
      try { proxy.consultar(); } catch (err) { expect(err.codigo).toBe('ROL_NO_AUTORIZADO'); }
      expect(espia.creados).toBe(0);
    });

    test('un AUDITOR autorizado tampoco puede ver resultados mientras la eleccion este abierta', () => {
      const { raiz } = escenario(); // mesas abiertas
      const proxy = crearServicioResultados({ raiz, usuario: 'aud1', rol: 'AUDITOR' });
      let error;
      try { proxy.consultar(); } catch (e) { error = e; }
      expect(error).toBeInstanceOf(ErrorAccesoResultados);
      expect(error.codigo).toBe('ELECCION_ABIERTA');
    });

    test('con la eleccion cerrada, un AUDITOR obtiene el consolidado', () => {
      const e = escenario(); cerrarTodo(e);
      const r = crearServicioResultados({ raiz: e.raiz, usuario: 'aud1', rol: 'AUDITOR' }).consultar();
      expect(r.votosPorCandidato).toEqual({ Ana: 4, Luis: 3, VOTO_BLANCO: 1 });
    });

    test('se comprueba el rol antes que el estado: no se revela el estado a quien no tiene derecho', () => {
      const { raiz } = escenario(); // abierta
      const proxy = crearServicioResultados({ raiz, usuario: 'v1', rol: 'VOTANTE' });
      expect.assertions(1);
      try { proxy.consultar(); } catch (e) { expect(e.codigo).toBe('ROL_NO_AUTORIZADO'); }
    });

    test('los roles permitidos son configurables sin tocar el proxy (Open/Closed)', () => {
      const e = escenario(); cerrarTodo(e);
      const jurado = crearServicioResultados({ raiz: e.raiz, usuario: 'j1', rol: 'JURADO', rolesPermitidos: ['JURADO'] });
      expect(jurado.consultar().totalVotos).toBe(8);
    });

    test('cada intento, permitido o denegado, queda auditado sin filtrar resultados', () => {
      const e = escenario();
      const proxy = crearServicioResultados({ raiz: e.raiz, usuario: 'aud1', rol: 'AUDITOR' });

      let antes = historial().length;
      expect(() => proxy.consultar()).toThrow();
      const denegado = historial().slice(antes).find((x) => x.nivel === 'WARN');
      expect(denegado.mensaje).toBe('Consulta de resultados denegada');
      expect(denegado.contexto).toEqual({ usuario: 'aud1', rol: 'AUDITOR', motivo: 'ELECCION_ABIERTA' });

      cerrarTodo(e);
      antes = historial().length;
      proxy.consultar();
      const permitido = historial().slice(antes).find((x) => x.mensaje === 'Consulta de resultados autorizada');
      expect(permitido.contexto).toEqual({ usuario: 'aud1', rol: 'AUDITOR' });
    });

    test('exige la funcion eleccionCerrada', () => {
      expect(() => new ProxyProteccionResultados({}, { usuario: 'u', rol: 'AUDITOR' })).toThrow('eleccionCerrada');
    });
  });

  describe('Virtual Proxy', () => {
    test('no crea el servicio real hasta la primera consulta', () => {
      const { raiz } = escenario();
      const { crear, espia } = servicioEspia(raiz);
      const virtual = new ProxyVirtualResultados(crear);
      expect(virtual.estaCreado()).toBe(false);
      expect(espia.creados).toBe(0);

      virtual.consultar(); virtual.consultar();
      expect(virtual.estaCreado()).toBe(true);
      expect(espia.creados).toBe(1);
    });

    test('exige una funcion que cree el servicio real', () => {
      expect(() => new ProxyVirtualResultados()).toThrow('funcion');
    });
  });

  describe('Caching Proxy', () => {
    test('con la eleccion cerrada, varias consultas hacen un solo calculo real y devuelven el mismo objeto', () => {
      const e = escenario(); cerrarTodo(e);
      const { crear, espia } = servicioEspia(e.raiz);
      const cache = new ProxyCacheResultados(new ProxyVirtualResultados(crear), { puedeCachear: () => e.raiz.todasCerradas() });

      const a = cache.consultar(); const b = cache.consultar(); const c = cache.consultar();
      expect(espia.consultas).toBe(1);
      expect(b).toBe(a);
      expect(c).toBe(a);
    });

    test('NO cachea mientras el resultado todavia puede cambiar (evita datos obsoletos)', () => {
      const e = escenario(); // abierta
      const { crear, espia } = servicioEspia(e.raiz);
      const cache = new ProxyCacheResultados(new ProxyVirtualResultados(crear), { puedeCachear: () => e.raiz.todasCerradas() });

      expect(cache.consultar().totalVotos).toBe(8);
      e.mesa1.registrarVoto('Luis'); // llega un voto mas
      expect(cache.consultar().totalVotos).toBe(9); // no sirvio el dato viejo
      expect(espia.consultas).toBe(2);
    });

    test('invalidar() fuerza un nuevo calculo', () => {
      const e = escenario(); cerrarTodo(e);
      const { crear, espia } = servicioEspia(e.raiz);
      const cache = new ProxyCacheResultados(new ProxyVirtualResultados(crear));
      cache.consultar(); cache.invalidar(); cache.consultar();
      expect(espia.consultas).toBe(2);
    });

    test('el resultado compartido esta congelado: un cliente no puede alterar lo que ven los demas', () => {
      const e = escenario(); cerrarTodo(e);
      const servicio = crearServicioResultados({ raiz: e.raiz, usuario: 'aud1', rol: 'AUDITOR' });
      const r = servicio.consultar();
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.votosPorCandidato)).toBe(true);
      try { r.votosPorCandidato.Ana = 9999; } catch (err) { /* modo estricto lanza */ }
      expect(servicio.consultar().votosPorCandidato.Ana).toBe(4);
    });
  });

  test('la cadena completa (Proteccion -> Cache -> Virtual -> Real) calcula una sola vez', () => {
    const e = escenario(); cerrarTodo(e);
    const antes = historial().length;
    const servicio = crearServicioResultados({ raiz: e.raiz, usuario: 'aud1', rol: 'AUDITOR' });
    servicio.consultar(); servicio.consultar(); servicio.consultar();

    const nuevos = historial().slice(antes);
    expect(nuevos.filter((x) => x.mensaje === 'Resultados consolidados')).toHaveLength(1);
    expect(nuevos.filter((x) => x.mensaje === 'Consulta de resultados autorizada')).toHaveLength(3);
  });
});
