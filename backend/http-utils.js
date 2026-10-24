class HttpError extends Error {
  constructor(status, mensaje, codigo = 'ERROR') {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
  }
}

const CABECERAS_SEGURAS = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
};

function enviarJson(res, status, cuerpo) {
  const texto = JSON.stringify(cuerpo);
  res.writeHead(status, {
    ...CABECERAS_SEGURAS,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(texto),
  });
  res.end(texto);
}

function leerJson(req, limiteBytes = 16 * 1024) {
  return new Promise((resolver, rechazar) => {
    let total = 0;
    const partes = [];
    req.on('data', (parte) => {
      total += parte.length;
      if (total > limiteBytes) {
        rechazar(new HttpError(413, 'El cuerpo de la solicitud es demasiado grande', 'CUERPO_GRANDE'));
        req.destroy();
        return;
      }
      partes.push(parte);
    });
    req.on('end', () => {
      if (total === 0) return resolver({});
      try {
        const valor = JSON.parse(Buffer.concat(partes).toString('utf8'));
        if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) throw new Error('no objeto');
        resolver(valor);
      } catch {
        rechazar(new HttpError(400, 'El cuerpo debe ser un objeto JSON valido', 'JSON_INVALIDO'));
      }
    });
    req.on('error', rechazar);
  });
}

module.exports = { HttpError, enviarJson, leerJson, CABECERAS_SEGURAS };
