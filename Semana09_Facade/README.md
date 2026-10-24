# Facade — Proceso de votación

## Por qué este patrón
Emitir un voto exige coordinar varios subsistemas en el orden correcto: identidad, autenticación del canal, control de doble voto, validación, urna y comprobante. Sin una fachada, cada cliente (pantalla o API) tendría que conocerlos y ordenarlos, y un orden incorrecto podría bloquear a un votante sin que haya votado. La fachada ofrece una sola operación y deja la lógica de negocio en los subsistemas.

## Participantes
| Rol | Clase | Archivo |
|---|---|---|
| Facade | `ProcesoVotacionFacade` | `proceso-votacion-facade.js` |
| Subsistema | `RegistroVotantes` | `registro-votantes.js` |
| Subsistema | `UrnaElectronica` | `urna-electronica.js` |
| Resultado de las operaciones | `Resultado` | `resultado.js` |
| Subsistemas de otras semanas | `VerificadorIdentidad` (Adapter), `FabricaCanalVotacion` (Abstract Factory), `NotificacionResultadoPublicado` (Bridge), `UnidadElectoral` (Composite) | |

## Flujo de `emitirVoto`
1. Verifica la identidad en el padrón.
2. Autentica según el canal (presencial u OTP virtual).
3. Comprueba que no haya votado.
4. Valida el voto según el canal.
5. Lo deposita en la urna. Si falla (mesa cerrada o inexistente), el votante **no** queda marcado como "ya votó".
6. Marca al votante.
7. Emite el comprobante del canal.

## Uso
```js
const fachada = new ProcesoVotacionFacade({
  verificador: new VerificadorIdentidadAdapter(new ServicioPadronExterno()),
  fabricaCanal: new FabricaVotacionPresencial(),
  urna: new UrnaElectronica(raiz),
});
fachada.emitirVoto({ documento: '1098765432', datosVotante: { identificacion: '1098765432', verificadoPorEncargado: true }, candidato: 'Ana', mesa: 'Mesa 1' });
```
En el canal virtual, `mesa` es el nombre de la urna virtual dentro de la jerarquía (por ejemplo `'URNA-VIRTUAL'`).

## Secreto del voto
`RegistroVotantes` guarda solo una huella con sal; la urna audita un id anónimo y la mesa; los rechazos se auditan únicamente con la etapa donde fallaron. El registro vive en memoria: en producción debería persistirse.

## Pruebas
`__tests__/facade.test.js` (14 pruebas): canal presencial y virtual, rechazos por etapa, doble voto, mesa cerrada, secreto del voto, auditoría de rechazos, verificador de prueba (DIP) y publicación de resultados solo con mesas cerradas.
