# Decorator — Reporte de resultados

## Por qué este patrón
Los resultados se entregan en formatos distintos: simple, oficial con encabezado y firma, copia con marca de agua, con observaciones del jurado. Con cuatro elementos opcionales hay hasta 16 combinaciones; con herencia serían 16 clases. Decorator las reemplaza por cuatro decoradores combinables y deja el cálculo separado de la presentación.

No se aplica al conteo de votos: alterar el resultado no es una extensión válida, solo la presentación del reporte lo es.

## Participantes
| Ingrediente | Clase | Archivo |
|---|---|---|
| Component | `ReporteElectoral` | `reporte-electoral.js` |
| ConcreteComponent | `ReporteResultadosBase` | `reporte-resultados-base.js` |
| Decorator | `ReporteDecorator` | `reporte-decorator.js` |
| ConcreteDecorators | `EncabezadoInstitucional`, `PieConFirma`, `MarcaAgua`, `NotasAlMargen` | `decoradores-concretos.js` |

## Uso
```js
const base = new ReporteResultadosBase('Alcaldia', { Ana: 60, Luis: 30, VOTO_BLANCO: 10 });
const oficial = new PieConFirma(new EncabezadoInstitucional(base), 'Registrador Delegado');
const completo = new NotasAlMargen(new MarcaAgua(oficial, 'COPIA'))
  .agregarObservacion('Escrutinio finalizado');
completo.generar();
```

## Notas
- `PieConFirma` agrega una huella SHA-256 del contenido que envuelve, por lo que **el orden de decoración importa**.
- La fecha del pie se inyecta (`reloj`) para que el reporte sea reproducible en pruebas.
- Un reporte decorado genera un único registro de auditoría.

## Pruebas
`__tests__/decorator.test.js` (14 pruebas): cada decorador, combinación, orden, huella verificable, auditoría única, extensión sin modificar clases existentes y validación de entradas.
