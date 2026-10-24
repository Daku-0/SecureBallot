process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'admin';
process.env.DB_PASS = 'secret';
process.env.API_KEY = 'abc123';

const http = require('http');
const { crearApp } = require('../app');
const { AlmacenOtp } = require('../almacen-otp');

let servidor; let ctx; let puerto;

function pedir(metodo, ruta, { rol = 'VOTANTE', usuario = 'u1', cuerpo, crudo } = {}) {
  return new Promise((resolver, rechazar) => {
    const datos = crudo !== undefined ? crudo : cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined;
    const req = http.request({
      host: '127.0.0.1', port: puerto, path: ruta, method: metodo,
      headers: { 'x-rol': rol, 'x-usuario': usuario, ...(datos ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(datos) } : {}) },
    }, (res) => {
      const partes = [];
      res.on('data', (p) => partes.push(p));
      res.on('end', () => {
        const texto = Buffer.concat(partes).toString('utf8');
        let json = null; try { json = JSON.parse(texto); } catch { /* no es JSON */ }
        resolver({ status: res.statusCode, json, texto, cabeceras: res.headers });
      });
    });
    req.on('error', rechazar);
    if (datos) req.write(datos);
    req.end();
  });
}

const votoPresencial = (doc, candidato = 'Ana Pérez', mesa = 'Mesa 1') =>
  pedir('POST', '/api/votos', { rol: 'JURADO', cuerpo: { canal: 'presencial', documento: doc, candidato, mesa } });

async function pedirOtp(doc) {
  const r = await pedir('POST', '/api/otp', { cuerpo: { documento: doc } });
  return r.json.datos.demoSms.match(/(\d{6})/)[1];
}
const votoVirtual = (doc, otp, candidato = 'Luis Gómez') =>
  pedir('POST', '/api/votos', { cuerpo: { canal: 'virtual', documento: doc, candidato, otp, dispositivoId: 'dispositivo-0001' } });

async function cerrarTodas() {
  const { json } = await pedir('GET', '/api/estado');
  for (const m of json.mesas) await pedir('POST', `/api/mesas/${encodeURIComponent(m.nombre)}/cerrar`, { rol: 'ADMIN_ELECTORAL' });
}

beforeEach((hecho) => {
  ({ servidor, ctx } = crearApp());
  servidor.listen(0, '127.0.0.1', () => { puerto = servidor.address().port; hecho(); });
});
afterEach((hecho) => { servidor.close(hecho); });

describe('API: lectura de la eleccion', () => {
  test('estado: lista las mesas abiertas y marca la urna virtual', async () => {
    const { status, json } = await pedir('GET', '/api/estado');
    expect(status).toBe(200);
    expect(json.totalMesas).toBe(5);
    expect(json.mesasCerradas).toBe(0);
    expect(json.eleccionCerrada).toBe(false);
    expect(json.mesas.find((m) => m.nombre === 'URNA-VIRTUAL').virtual).toBe(true);
  });

  test('jerarquia: devuelve el arbol del Composite sin conteos parciales', async () => {
    await votoPresencial('1098765432');
    const { json, texto } = await pedir('GET', '/api/jerarquia');
    expect(json.nivel).toBe('Nacional');
    expect(json.hijos[0].hijos[0].nombre).toBe('Bucaramanga');
    expect(texto).not.toMatch(/votos/i); // no hay forma de ver parciales por aqui
  });

  test('tarjeton: candidatos del Flyweight, compartidos entre mesas', async () => {
    const a = await pedir('GET', '/api/tarjeton?mesa=Mesa%201');
    const b = await pedir('GET', '/api/tarjeton?mesa=Mesa%202');
    expect(a.json.opciones.map((o) => o.nombre)).toEqual(['Ana Pérez', 'Luis Gómez', 'Carla Ríos']);
    expect(b.json.instanciasCompartidas).toBe(3);
  });

  test('tarjeton de una mesa inexistente devuelve 404', async () => {
    expect((await pedir('GET', '/api/tarjeton?mesa=Mesa%2099')).status).toBe(404);
  });
});

describe('API: votar', () => {
  test('voto presencial autorizado por el jurado queda registrado y devuelve comprobante', async () => {
    const r = await votoPresencial('1098765432');
    expect(r.status).toBe(201);
    expect(r.json.datos.comprobante.canal).toBe('presencial');
    expect(r.json.datos.comprobante.contenido).toContain('Mesa 1');
  });

  test('un votante NO puede habilitar un voto presencial (lo autoriza el jurado)', async () => {
    const r = await pedir('POST', '/api/votos', { rol: 'VOTANTE', cuerpo: { canal: 'presencial', documento: '1098765432', candidato: 'Ana Pérez', mesa: 'Mesa 1' } });
    expect(r.status).toBe(403);
    expect(r.json.codigo).toBe('ROL_NO_AUTORIZADO');
  });

  test('un documento fuera del padron es rechazado', async () => {
    const r = await votoPresencial('901234567');
    expect(r.status).toBe(422);
    expect(r.json.mensaje).toContain('padron');
  });

  test('no se puede votar dos veces, ni siquiera cambiando de canal', async () => {
    expect((await votoPresencial('1098765432')).status).toBe(201);
    const otp = await pedirOtp('1098765432');
    const segundo = await votoVirtual('1098765432', otp);
    expect(segundo.status).toBe(422);
    expect(segundo.json.mensaje).toContain('ya emitio');
  });

  test('rechaza candidatos que no estan en el tarjeton, pero admite voto en blanco', async () => {
    expect((await votoPresencial('1098765432', 'Candidato Falso')).status).toBe(400);
    expect((await votoPresencial('1098765432', 'VOTO_BLANCO')).status).toBe(201);
  });

  test('valida documento, canal y cuerpo JSON', async () => {
    expect((await votoPresencial('12ab')).status).toBe(400);
    expect((await pedir('POST', '/api/votos', { cuerpo: { canal: 'telegrama' } })).status).toBe(400);
    const malo = await pedir('POST', '/api/votos', { crudo: '{no es json' });
    expect(malo.status).toBe(400);
    expect(malo.json.codigo).toBe('JSON_INVALIDO');
  });

  test('voto virtual: el codigo llega por el Bridge (SMS) y se valida en el servidor', async () => {
    const otp = await pedirOtp('1012345678');
    const r = await votoVirtual('1012345678', otp);
    expect(r.status).toBe(201);
    expect(r.json.datos.comprobante.canal).toBe('virtual');
  });

  test('voto virtual con codigo incorrecto es rechazado y no cuenta', async () => {
    await pedirOtp('1012345678');
    const r = await votoVirtual('1012345678', '000000');
    expect(r.status).toBe(422);
    expect(r.json.mensaje).toContain('otp');
  });

  test('voto virtual sin pedir codigo es rechazado (el cliente no puede inventar el esperado)', async () => {
    const r = await votoVirtual('1012345678', '123456');
    expect(r.status).toBe(422);
  });

  test('tras 5 intentos fallidos el codigo se invalida, incluso si despues se digita bien', async () => {
    const otp = await pedirOtp('1012345678');
    for (let i = 0; i < 5; i++) await votoVirtual('1012345678', '000000');
    expect((await votoVirtual('1012345678', otp)).status).toBe(422);
  });

  test('el codigo es de un solo uso', async () => {
    const otp = await pedirOtp('1012345678');
    expect((await votoVirtual('1012345678', otp)).status).toBe(201);
    expect((await votoVirtual('1012345679', otp)).status).toBe(422);
  });

  test('votar en una mesa cerrada falla y no bloquea al votante', async () => {
    await pedir('POST', '/api/mesas/Mesa%201/cerrar', { rol: 'JURADO' });
    expect((await votoPresencial('1098765432', 'Ana Pérez', 'Mesa 1')).status).toBe(422);
    expect((await votoPresencial('1098765432', 'Ana Pérez', 'Mesa 2')).status).toBe(201);
  });

  test('la urna virtual no acepta votos presenciales', async () => {
    expect((await votoPresencial('1098765432', 'Ana Pérez', 'URNA-VIRTUAL')).status).toBe(400);
  });
});

describe('API: cierre, resultados y reportes (Proxy + Decorator)', () => {
  test('un votante no puede cerrar mesas', async () => {
    expect((await pedir('POST', '/api/mesas/Mesa%201/cerrar', { rol: 'VOTANTE' })).status).toBe(403);
  });

  test('cerrar una mesa inexistente devuelve 404', async () => {
    expect((await pedir('POST', '/api/mesas/Mesa%2099/cerrar', { rol: 'ADMIN_ELECTORAL' })).status).toBe(404);
  });

  test('un votante no ve resultados; un auditor tampoco mientras haya mesas abiertas', async () => {
    const votante = await pedir('GET', '/api/resultados', { rol: 'VOTANTE' });
    expect(votante.status).toBe(403);
    expect(votante.json.codigo).toBe('ROL_NO_AUTORIZADO');

    const auditor = await pedir('GET', '/api/resultados', { rol: 'AUDITOR' });
    expect(auditor.status).toBe(403);
    expect(auditor.json.codigo).toBe('ELECCION_ABIERTA');
  });

  test('con todas las mesas cerradas, el auditor obtiene el consolidado correcto', async () => {
    await votoPresencial('1098765432', 'Ana Pérez', 'Mesa 1');
    await votoPresencial('1098765433', 'Ana Pérez', 'Mesa 3');
    await votoPresencial('1098765434', 'VOTO_BLANCO', 'Mesa 4');
    const otp = await pedirOtp('1012345678');
    await votoVirtual('1012345678', otp, 'Luis Gómez');
    await cerrarTodas();

    const r = await pedir('GET', '/api/resultados', { rol: 'AUDITOR' });
    expect(r.status).toBe(200);
    expect(r.json.datos.totalVotos).toBe(4);
    expect(r.json.datos.votosPorCandidato).toEqual({ 'Ana Pérez': 2, VOTO_BLANCO: 1, 'Luis Gómez': 1 });
    expect(r.json.datos.ganador).toBe('Ana Pérez');
  });

  test('el reporte pasa por el Proxy y aplica solo los decoradores pedidos', async () => {
    await votoPresencial('1098765432');
    expect((await pedir('POST', '/api/reporte', { rol: 'AUDITOR', cuerpo: {} })).status).toBe(403);
    await cerrarTodas();

    const simple = await pedir('POST', '/api/reporte', { rol: 'AUDITOR', cuerpo: {} });
    expect(simple.json.datos.texto).toContain('Total de votos: 1');
    expect(simple.json.datos.texto).not.toContain('SHA-256');

    const completo = await pedir('POST', '/api/reporte', { rol: 'AUDITOR', cuerpo: { encabezado: true, firmante: 'Delegado', marcaAgua: 'COPIA', observaciones: ['Sin novedades'] } });
    expect(completo.json.datos.texto).toContain('[COPIA] Firma: Delegado');
    expect(completo.json.datos.texto).toMatch(/Huella SHA-256: [0-9a-f]{64}/);
    expect(completo.json.datos.texto).toContain('+ Sin novedades');
    expect(completo.json.datos.descripcion).toContain('Marca de agua');
  });

  test('publicar resultados exige rol de administrador, mesas cerradas y canal valido', async () => {
    const cuerpo = { canal: 'email', destinatario: 'a@x.com' };
    expect((await pedir('POST', '/api/publicar', { rol: 'AUDITOR', cuerpo })).status).toBe(403);
    expect((await pedir('POST', '/api/publicar', { rol: 'ADMIN_ELECTORAL', cuerpo })).status).toBe(409);

    await votoPresencial('1098765432');
    await cerrarTodas();
    const ok = await pedir('POST', '/api/publicar', { rol: 'ADMIN_ELECTORAL', cuerpo });
    expect(ok.status).toBe(200);
    expect(ok.json.datos.aviso).toContain('[EMAIL -> a@x.com]');
    expect(ok.json.datos.aviso).toContain('Total de votos: 1');

    expect((await pedir('POST', '/api/publicar', { rol: 'ADMIN_ELECTORAL', cuerpo: { canal: 'paloma', destinatario: 'x' } })).status).toBe(400);
  });
});

describe('API: auditoria, identidad y reinicio', () => {
  test('la auditoria es solo para auditor o administrador', async () => {
    expect((await pedir('GET', '/api/auditoria', { rol: 'VOTANTE' })).status).toBe(403);
    expect((await pedir('GET', '/api/auditoria', { rol: 'JURADO' })).status).toBe(403);
    expect((await pedir('GET', '/api/auditoria', { rol: 'AUDITOR' })).status).toBe(200);
  });

  test('la cadena de auditoria es integra y no expone documentos completos ni el candidato', async () => {
    await votoPresencial('1098765432', 'Carla Ríos');
    const r = await pedir('GET', '/api/auditoria?limite=200', { rol: 'AUDITOR' });
    expect(r.json.datos.integra).toBe(true);
    expect(r.texto).not.toContain('1098765432');
    expect(r.texto).toContain('***432');
    const voto = r.json.datos.entradas.find((e) => e.nivel === 'AUDITORIA_VOTO');
    expect(Object.keys(voto.contexto).sort()).toEqual(['idVotoAnonimo', 'mesaOColegio']);
    expect(JSON.stringify(voto)).not.toContain('Carla');
  });

  test('un rol desconocido se rechaza', async () => {
    expect((await pedir('GET', '/api/estado', { rol: 'SUPERUSUARIO' })).status).toBe(400);
  });

  test('rutas y metodos inexistentes', async () => {
    expect((await pedir('GET', '/api/nada')).status).toBe(404);
    expect((await pedir('GET', '/api/votos')).status).toBe(405);
  });

  test('las respuestas no se guardan en cache del navegador', async () => {
    const r = await pedir('GET', '/api/estado');
    expect(r.cabeceras['cache-control']).toBe('no-store');
    expect(r.cabeceras['x-content-type-options']).toBe('nosniff');
  });

  test('reiniciar es solo del administrador y deja la eleccion en limpio', async () => {
    await votoPresencial('1098765432');
    await pedir('POST', '/api/mesas/Mesa%201/cerrar', { rol: 'JURADO' });
    expect((await pedir('POST', '/api/reiniciar', { rol: 'JURADO' })).status).toBe(403);
    expect((await pedir('POST', '/api/reiniciar', { rol: 'ADMIN_ELECTORAL' })).status).toBe(200);

    const { json } = await pedir('GET', '/api/estado');
    expect(json.mesasCerradas).toBe(0);
    expect((await votoPresencial('1098765432')).status).toBe(201); // el registro de votantes tambien se reinicio
  });
});

describe('AlmacenOtp', () => {
  test('el codigo vence con el tiempo', () => {
    let ahora = 1000;
    const almacen = new AlmacenOtp({ ttlMs: 100, ahora: () => ahora });
    const codigo = almacen.emitir('1');
    expect(almacen.esperado('1')).toBe(codigo);
    ahora = 1200;
    expect(almacen.esperado('1')).toBeNull();
  });
});
