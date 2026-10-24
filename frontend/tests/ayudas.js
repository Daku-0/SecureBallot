import { vi } from 'vitest';

/** Sustituye fetch por una tabla "METODO /ruta" -> { status, json }. Devuelve el registro de llamadas. */
export function simularApi(tabla) {
  const llamadas = [];
  globalThis.fetch = vi.fn(async (url, opciones = {}) => {
    const metodo = opciones.method || 'GET';
    const ruta = String(url).split('?')[0];
    llamadas.push({ metodo, ruta, url: String(url), cabeceras: opciones.headers || {}, cuerpo: opciones.body ? JSON.parse(opciones.body) : undefined });
    const manejador = tabla[`${metodo} ${ruta}`];
    if (!manejador) return { ok: false, status: 404, json: async () => ({ mensaje: `Sin simulacion para ${metodo} ${ruta}` }) };
    const { status = 200, json } = typeof manejador === 'function' ? manejador(llamadas.at(-1)) : manejador;
    return { ok: status < 400, status, json: async () => json };
  });
  return llamadas;
}

export const ESTADO = {
  eleccion: 'Elección de prueba', totalMesas: 3, mesasCerradas: 0, eleccionCerrada: false,
  mesas: [
    { nombre: 'Mesa 1', cerrada: false, virtual: false },
    { nombre: 'Mesa 2', cerrada: false, virtual: false },
    { nombre: 'URNA-VIRTUAL', cerrada: false, virtual: true },
  ],
};

export const tarjetonDe = (mesa) => ({
  mesa, votoBlanco: 'VOTO_BLANCO', instanciasCompartidas: 2,
  opciones: [
    { posicion: 1, codigo: 'C1', nombre: 'Ana Pérez', partido: 'Partido Verde', propuesta: 'Movilidad.' },
    { posicion: 2, codigo: 'C2', nombre: 'Luis Gómez', partido: 'Partido Azul', propuesta: 'Salud.' },
  ],
});

export const ARBOL = {
  tipo: 'unidad', nombre: 'Colombia', nivel: 'Nacional', hijos: [
    { tipo: 'unidad', nombre: 'Puesto Centro', nivel: 'Puesto', hijos: [
      { tipo: 'mesa', nombre: 'Mesa 1', cerrada: false },
      { tipo: 'mesa', nombre: 'Mesa 2', cerrada: true },
    ] },
  ],
};
