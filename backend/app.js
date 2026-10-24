require('./config-entorno');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { HttpError, enviarJson, leerJson, CABECERAS_SEGURAS } = require('./http-utils');
const { leerIdentidad } = require('./identidad');
const { crearEleccion } = require('./eleccion');
const { rutas } = require('./rutas');
const { ErrorAccesoResultados } = require('../Semana10_Proxy');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json',
};

function servirEstatico(req, res, carpeta) {
  if (!carpeta || !fs.existsSync(path.join(carpeta, 'index.html'))) return false;
  const raiz = path.resolve(carpeta);
  let ruta;
  try {
    ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    throw new HttpError(400, 'Ruta mal formada', 'RUTA_INVALIDA');
  }
  if (ruta.includes('\0')) throw new HttpError(400, 'Ruta mal formada', 'RUTA_INVALIDA');
  let archivo = path.resolve(raiz, `.${ruta}`);
  // Debe quedar DENTRO de la carpeta: comparar con el separador evita confundir "dist" con "dist-secreto"
  if (archivo !== raiz && !archivo.startsWith(raiz + path.sep)) return false;
  if (!fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) archivo = path.join(raiz, 'index.html'); // la app es de una sola pagina
  res.writeHead(200, { ...CABECERAS_SEGURAS, 'Cache-Control': archivo.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache', 'Content-Type': MIME[path.extname(archivo)] || 'application/octet-stream' });
  fs.createReadStream(archivo).pipe(res);
  return true;
}

function crearApp({ carpetaEstatica } = {}) {
  const ctx = { estado: crearEleccion(), reiniciar() { ctx.estado = crearEleccion(); } };

  const servidor = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (!url.pathname.startsWith('/api/')) {
        if (req.method === 'GET' && servirEstatico(req, res, carpetaEstatica)) return;
        throw new HttpError(404, 'Ruta no encontrada', 'NO_ENCONTRADA');
      }

      const ruta = rutas.find((r) => r.metodo === req.method && r.patron.test(url.pathname));
      if (!ruta) {
        const existe = rutas.some((r) => r.patron.test(url.pathname));
        throw new HttpError(existe ? 405 : 404, existe ? 'Metodo no permitido' : 'Ruta no encontrada', existe ? 'METODO_NO_PERMITIDO' : 'NO_ENCONTRADA');
      }

      const identidad = leerIdentidad(req);
      const cuerpo = req.method === 'POST' ? await leerJson(req) : {};
      const params = url.pathname.match(ruta.patron).slice(1);
      const { status, cuerpo: respuesta } = ruta.manejador({ ctx, estado: ctx.estado, req, url, params, cuerpo, identidad });
      enviarJson(res, status, respuesta);
    } catch (error) {
      if (error instanceof HttpError) return enviarJson(res, error.status, { exito: false, codigo: error.codigo, mensaje: error.message });
      if (error instanceof ErrorAccesoResultados) return enviarJson(res, 403, { exito: false, codigo: error.codigo, mensaje: error.message });
      console.error('Error interno:', error);
      enviarJson(res, 500, { exito: false, codigo: 'ERROR_INTERNO', mensaje: 'Ocurrio un error interno' });
    }
  });

  return { servidor, ctx };
}

module.exports = { crearApp };
