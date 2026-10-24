const BASE = import.meta.env.VITE_API_URL || '';

// Las cabeceras HTTP solo admiten Latin-1: se descarta lo demas para no romper la peticion
const cabeceraSegura = (texto) => String(texto).replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '').slice(0, 40) || 'anonimo';

export function crearApi(sesion) {
  async function llamar(metodo, ruta, cuerpo) {
    try {
      const respuesta = await fetch(BASE + ruta, {
        method: metodo,
        headers: {
          'Content-Type': 'application/json',
          'x-rol': sesion.rol,
          'x-usuario': cabeceraSegura(sesion.usuario),
        },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      });
      let datos = null;
      try { datos = await respuesta.json(); } catch { /* respuesta sin cuerpo */ }
      return { ok: respuesta.ok, status: respuesta.status, datos };
    } catch {
      return {
        ok: false, status: 0,
        datos: { mensaje: 'No se pudo conectar con el servidor. Verifica que la API esté en ejecución.' },
      };
    }
  }
  return { get: (ruta) => llamar('GET', ruta), post: (ruta, cuerpo = {}) => llamar('POST', ruta, cuerpo) };
}
