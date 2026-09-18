## Patrón Prototype — qué aporta al proyecto

Para SecureBallot apliqué Prototype al caso de una **elección de alcalde**.
La configuración de fondo (candidatos a la alcaldía, umbral de quórum, si
se permite voto en blanco) es una sola para toda la ciudad; lo que cambia
por comuna o localidad es únicamente el nombre y las mesas de votación de
esa zona.

Sin Prototype, cada comuna tendría que volver a pasar por todo el Builder
(Semana05_builder) repitiendo candidatos y quórum manualmente. Con
Prototype, la elección "maestra" se construye **una sola vez** con el
Builder ya existente, y cada comuna simplemente **clona** esa plantilla y
ajusta solo lo que le pertenece.

### Por qué el clon tiene que ser profundo

`candidatos` y `mesas` son arrays. Un clon superficial (`{...eleccion}`)
los compartiría por referencia entre la maestra y todos los clones. Con
una sola comuna eso pasaría desapercibido, pero apenas hay varias, agregar
una mesa en una comuna terminaría apareciendo también en otra — un bug
silencioso y difícil de detectar. `EleccionPrototipo.clonar()` usa
`structuredClone()` para copiar los datos antes de crear la nueva
`Eleccion`, evitando ese problema estructuralmente. Las pruebas en
`__tests__/prototype.test.js` verifican explícitamente que modificar un
clon nunca afecta a la maestra ni a otros clones.

### Por qué esto es Prototype y no simplemente "llamar al Builder otra vez"

Builder sigue siendo necesario para construir la plantilla la primera vez
— Prototype no lo reemplaza. La diferencia es que Prototype evita repetir
ese proceso completo cuando ya existe una configuración válida y solo se
necesita una variación menor de ella. El patrón resuelve un problema
distinto: no "cómo construyo un objeto complejo paso a paso" (eso es
Builder), sino "cómo obtengo una copia independiente de un objeto ya
configurado, sin rehacer la configuración ni arriesgar que las copias se
contaminen entre sí".

### Por qué escala a nivel nacional sin rediseño

El `RegistroPlantillasEleccion` no sabe ni le importa si la unidad que
clona es una comuna dentro de una ciudad o una ciudad dentro de un país:
en ambos casos el mecanismo es el mismo — tomar la configuración base y
clonarla por unidad territorial, variando solo `nombre` y `mesas`. Si la
plataforma pasa de una elección de alcalde a una elección presidencial
nacional, se usa la misma clase `EleccionPrototipo` y el mismo registro,
solo cambia qué se pasa como unidad (ciudad en vez de comuna).

### Integración con el resto del proyecto

`__tests__/integracion.test.js` prueba el cableado real entre cuatro
patrones — Builder → Prototype → Abstract Factory → Factory Method — con
aserciones sobre el contenido exacto (nombre, candidato, mesa, conteo de
votos), no solo que las llamadas no truenen. Ahí también quedó documentado
qué integración es real y cuál es solo un mapeo manual del cliente:

- **Builder → Prototype**: garantía estricta. El clon es una instancia real de `Eleccion` con los mismos campos.
- **Prototype → Abstract Factory**: conexión real pero débil — `ValidadorDeVotoPresencial` solo exige que candidato/mesa sean valores truthy, no verifica que vengan de esa `Eleccion`. Se prueba que el dato exacto tomado del clon llega intacto hasta el comprobante.
- **Prototype → Factory Method**: no hay conversión automática entre `Eleccion` y la forma que espera `GeneradorReporte` (`Eleccion` no lleva conteo de votos). Es un mapeo manual del cliente, probado como tal.

Toda esta auditoría queda registrada además en el `LoggerCentralizado`
(Semana03), reutilizado sin modificarlo.

Ningún archivo de semanas anteriores fue modificado; todo se reutiliza
vía `require`. Esta carpeta no tiene `demo.js`: la integración entre
patrones ya queda demostrada y verificada automáticamente por
`integracion.test.js`, así que un script aparte solo repetiría lo mismo
sin aportar cobertura nueva.

**Evidencia:** el código está en los archivos de esta carpeta; las
pruebas del patrón en sí están en `__tests__/prototype.test.js` y la
integración entre patrones en `__tests__/integracion.test.js`.
