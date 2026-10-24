process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'admin';
process.env.DB_PASS = 'secret';
process.env.API_KEY = 'abc123';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { crearApp } = require('../app');

let servidor; let puerto; let base;

function pedir(ruta) {
  return new Promise((resolver, rechazar) => {
    http.get({ host: '127.0.0.1', port: puerto, path: ruta }, (res) => {
      const partes = [];
      res.on('data', (p) => partes.push(p));
      res.on('end', () => resolver({ status: res.statusCode, texto: Buffer.concat(partes).toString('utf8'), cabeceras: res.headers }));
    }).on('error', rechazar);
  });
}

beforeAll(async () => {
  base = fs.mkdtempSync(path.join(os.tmpdir(), 'sb-'));
  fs.mkdirSync(path.join(base, 'dist', 'assets'), { recursive: true });
  fs.mkdirSync(path.join(base, 'dist-secreto'));
  fs.writeFileSync(path.join(base, 'dist', 'index.html'), '<div id="raiz">SPA</div>');
  fs.writeFileSync(path.join(base, 'dist', 'assets', 'app-1.js'), 'console.log(1)');
  fs.writeFileSync(path.join(base, 'dist-secreto', 'clave.txt'), 'CONTENIDO-SECRETO');
  fs.writeFileSync(path.join(base, 'fuera.txt'), 'CONTENIDO-SECRETO');
  const app = crearApp({ carpetaEstatica: path.join(base, 'dist') });
  servidor = app.servidor;
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  puerto = servidor.address().port;
});

afterAll(async () => {
  await new Promise((r) => servidor.close(r));
  fs.rmSync(base, { recursive: true, force: true });
});

describe('Archivos estaticos de la SPA', () => {
  test('sirve index.html y los assets con su tipo y cache', async () => {
    const raiz = await pedir('/');
    expect(raiz.status).toBe(200);
    expect(raiz.texto).toContain('SPA');
    expect(raiz.cabeceras['cache-control']).toBe('no-cache');
    const js = await pedir('/assets/app-1.js');
    expect(js.cabeceras['content-type']).toContain('text/javascript');
    expect(js.cabeceras['cache-control']).toContain('immutable');
  });

  test('una ruta de la SPA que no es un archivo devuelve index.html', async () => {
    const r = await pedir('/panel');
    expect(r.status).toBe(200);
    expect(r.texto).toContain('SPA');
  });

  test.each([
    '/../fuera.txt',
    '/../dist-secreto/clave.txt',
    '/%2e%2e/dist-secreto/clave.txt',
    '/assets/../../dist-secreto/clave.txt',
    '/..%5cdist-secreto%5cclave.txt',
  ])('no permite salir de la carpeta: %s', async (ruta) => {
    const r = await pedir(ruta);
    expect(r.texto).not.toContain('CONTENIDO-SECRETO');
  });

  test('una ruta con porcentaje mal formado o byte nulo recibe 400, no 500', async () => {
    expect((await pedir('/%E0%A4%A')).status).toBe(400);
    expect((await pedir('/a%00b')).status).toBe(400);
  });

  test('la API sigue funcionando junto a los estaticos', async () => {
    const r = await pedir('/api/estado');
    expect(r.status).toBe(200);
  });
});
