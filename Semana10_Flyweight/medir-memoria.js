/**
 * Medicion REAL de memoria: tarjetones con copias propias de cada candidato
 * (enfoque ingenuo) vs. tarjetones que comparten Flyweights.
 *
 * Ejecutar con:  node --expose-gc Semana10_Flyweight/medir-memoria.js
 *
 * Cada copia ingenua simula lo que pasaria si cada mesa cargara el candidato
 * desde su origen de datos: un objeto con strings propios (por eso se pasa
 * por JSON, que crea strings nuevos en lugar de compartir la misma referencia).
 */
process.env.DB_HOST = process.env.DB_HOST || 'x';
process.env.DB_USER = process.env.DB_USER || 'x';
process.env.DB_PASS = process.env.DB_PASS || 'x';
process.env.API_KEY = process.env.API_KEY || 'x';

const { FabricaCandidatos, Tarjeton } = require('./index');

const MESAS = Number(process.argv[2]) || 50000;
const CANDIDATOS_DISTINTOS = 12;
const POR_TARJETON = 8;

if (typeof global.gc !== 'function') {
  console.error('Ejecuta con: node --expose-gc Semana10_Flyweight/medir-memoria.js');
  process.exit(1);
}

const definicion = (i) => ({
  nombre: `Candidato Numero ${i}`,
  partido: `Partido ${i % 5}`,
  propuesta: `Programa de gobierno del candidato ${i}: ` + 'educacion, salud, movilidad y seguridad. '.repeat(12),
});
const codigos = Array.from({ length: CANDIDATOS_DISTINTOS }, (_, i) => `C${i + 1}`);
const codigosDeMesa = (m) => Array.from({ length: POR_TARJETON }, (_, k) => codigos[(m + k) % CANDIDATOS_DISTINTOS]);
const heapMB = () => { global.gc(); return process.memoryUsage().heapUsed / 1024 / 1024; };

// --- Enfoque ingenuo: cada opcion de cada tarjeton tiene su propia copia
let base = heapMB();
const ingenuo = [];
for (let m = 0; m < MESAS; m++) {
  ingenuo.push({
    mesa: `Mesa ${m}`,
    opciones: codigosDeMesa(m).map((c, i) => ({
      candidato: JSON.parse(JSON.stringify({ codigo: c, ...definicion(Number(c.slice(1))) })),
      posicion: i + 1,
    })),
  });
}
const memIngenuo = heapMB() - base;
ingenuo.length = 0;

// --- Enfoque Flyweight: los candidatos se comparten
base = heapMB();
const fabrica = new FabricaCandidatos((c) => JSON.parse(JSON.stringify(definicion(Number(c.slice(1))))));
const conFlyweight = [];
for (let m = 0; m < MESAS; m++) conFlyweight.push(new Tarjeton(`Mesa ${m}`, codigosDeMesa(m), fabrica));
const memFlyweight = heapMB() - base;

const opciones = MESAS * POR_TARJETON;
console.log(`Mesas: ${MESAS}  |  opciones totales: ${opciones}`);
console.log(`Objetos Candidato -> ingenuo: ${opciones}  |  flyweight: ${fabrica.getTotalInstancias()}`);
console.log(`Memoria heap      -> ingenuo: ${memIngenuo.toFixed(1)} MB  |  flyweight: ${memFlyweight.toFixed(1)} MB`);
console.log(`Ahorro de memoria: ${(100 - (memFlyweight * 100) / memIngenuo).toFixed(1)}%`);
console.log(`(se retiene la referencia a ${conFlyweight.length} tarjetones para que no se liberen antes de medir)`);
