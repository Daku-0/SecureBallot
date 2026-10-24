# Flyweight — Catálogo de candidatos

## Por qué este patrón
Cada mesa muestra un tarjetón con los mismos candidatos. Si cada tarjetón guardara su propia copia de los datos (nombre, partido, propuesta), la misma información se repetiría cientos de miles de veces en una elección grande. Flyweight guarda esos datos una sola vez y los comparte.

## Participantes
| Ingrediente | Clase | Archivo |
|---|---|---|
| Flyweight (estado intrínseco, inmutable) | `Candidato` | `candidato.js` |
| Flyweight Factory | `FabricaCandidatos` | `fabrica-candidatos.js` |
| Cliente (estado extrínseco: posición y mesa) | `Tarjeton`, `OpcionTarjeton` | `tarjeton.js` |

## Uso
```js
const fabrica = new FabricaCandidatos((codigo) => catalogo[codigo] || null);
const t1 = new Tarjeton('Mesa 1', ['C1', 'C2'], fabrica);
const t2 = new Tarjeton('Mesa 2', ['C2', 'C1'], fabrica);
t1.opciones[0].candidato === t2.opciones[1].candidato; // true: misma instancia
```

## Alcance y límites
Se aplica al catálogo de candidatos, **no** a los votos: cada voto es único y compartirlo o enlazarlo comprometería el secreto. Su beneficio depende de la escala; con pocas mesas el ahorro es marginal.

## Medición de memoria
```bash
node --expose-gc Semana10_Flyweight/medir-memoria.js 50000
```
Resultado de referencia con 50.000 mesas y 8 candidatos por tarjetón (los MB exactos varían según el equipo):
```
Objetos Candidato -> ingenuo: 400000  |  flyweight: 12
Memoria heap      -> ingenuo: 271.6 MB  |  flyweight: 24.5 MB
Ahorro de memoria: 91.0%
```

## Pruebas
`__tests__/flyweight.test.js` (10 pruebas): misma instancia por código, pocas instancias para miles de opciones, una sola consulta al origen, inmutabilidad, estado extrínseco fuera del flyweight, códigos inexistentes, tarjetones inválidos y auditoría solo al crear.
