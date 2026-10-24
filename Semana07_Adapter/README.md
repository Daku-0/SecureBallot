* [ ] 

# Adapter — Verificación de identidad del votante

## Por qué este patrón

SecureBallot debe confirmar que un votante está en el padrón electoral, pero ese padrón lo ofrece un servicio externo que no controlamos y cuya interfaz es distinta a la que espera el proceso de votación (`consultarCedula` con respuesta `{ status, data, errorCode }`, frente a `verificar` con respuesta `{ valido, nombreCompleto }`). Adapter traduce entre ambas sin tocar ninguna de las dos.

## Participantes

| Ingrediente                | Clase                           | Archivo                              |
| -------------------------- | ------------------------------- | ------------------------------------ |
| Target                     | `VerificadorIdentidad`        | `verificador-identidad.js`         |
| Adaptee                    | `ServicioPadronExterno`       | `servicio-padron-externo.js`       |
| Adapter (por composición) | `VerificadorIdentidadAdapter` | `verificador-identidad-adapter.js` |

## Uso

```js
const verificador = new VerificadorIdentidadAdapter(new ServicioPadronExterno());
verificador.verificar('1098765432'); // { valido: true, nombreCompleto: 'Ciudadano 1098765432' }
verificador.verificar('901234567');  // { valido: false, nombreCompleto: null }
```

## Pruebas

`__tests__/adapter.test.js` (5 pruebas): cumple el Target, traduce respuestas OK y NOT_FOUND, registra cada verificación en el `LoggerCentralizado` y funciona con un segundo servicio externo sin cambiar el Adapter.

## Relación con otros patrones

`ProcesoVotacionFacade` (Semana 9) lo usa como verificador de identidad.
