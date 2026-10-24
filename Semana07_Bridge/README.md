# Bridge — Notificaciones de la elección

## Por qué este patrón
Hay dos dimensiones independientes: **qué** se notifica (apertura de mesa, resultado publicado, alerta de cierre) y **cómo** se envía (email, SMS, push). Con herencia pura serían 3 × 3 = 9 clases, y cada tipo o canal nuevo multiplicaría el problema. Bridge las separa en dos jerarquías unidas por composición: 6 clases concretas en lugar de 9.

## Participantes
| Ingrediente | Clase | Archivo |
|---|---|---|
| Implementor | `CanalEnvio` | `canal-envio.js` |
| Concrete Implementors | `CanalEmail`, `CanalSMS`, `CanalPush` | `canal-envio.js` |
| Abstraction (el puente) | `Notificacion` | `notificacion.js` |
| Refined Abstractions | `NotificacionAperturaMesa`, `NotificacionResultadoPublicado`, `NotificacionAlertaCierre` | `tipos-notificacion.js` |

## Uso
```js
new NotificacionResultadoPublicado(new CanalSMS())
  .enviar('3000000000', { nombreEleccion: 'Alcaldia', totalVotos: 10 });
```

## Pruebas
`__tests__/bridge.test.js` (3 pruebas): un mismo tipo funciona con los tres canales, distintos tipos generan contenido distinto con el mismo canal, y cada envío queda en el `LoggerCentralizado`.

## Relación con otros patrones
`ProcesoVotacionFacade.publicarResultados()` usa `NotificacionResultadoPublicado` para avisar el total de votos.
