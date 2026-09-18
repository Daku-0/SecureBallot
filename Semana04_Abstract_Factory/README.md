## Patrón Abstract Factory — qué aporta al proyecto

Para SecureBallot apliqué Abstract Factory a la separación entre el canal
de votación **presencial/asistido** y el canal **virtual/remoto**. Los dos
siguen siendo 100% electrónicos: en el canal presencial el votante está en
un punto de votación físico y un encargado lo orienta en el uso del
sistema, pero el voto se emite de forma electrónica igual que en el canal
remoto, donde el ciudadano hace todo desde su propio dispositivo. No hay
papel en ningún caso.

Cada canal necesita tres componentes que deben ser coherentes entre sí:
`Autenticador`, `ValidadorDeVoto` y `EmisorDeComprobante`. Lo que hace
viable el patrón aquí no es que existan variantes por canal (eso ya lo
resuelve Factory Method), sino que esas tres piezas **tienen que
pertenecer al mismo canal**. Si el código cliente pudiera pedir un
`AutenticadorVirtual` (autentica por OTP) y un
`EmisorDeComprobantePresencial` (asume que hubo un encargado presente),
el sistema quedaría en un estado inconsistente. `FabricaCanalVotacion`
impide esa mezcla: el cliente elige una fábrica una sola vez y todos los
componentes que obtiene de ella pertenecen a la misma familia.

### Por qué esto es Abstract Factory y no Factory Method

Factory Method (Semana04_PFM) resuelve "un producto, muchas variantes":
`GeneradorReporte` solo decide QUÉ tipo de `ReporteResultados` crear.
Abstract Factory resuelve un problema distinto: "una familia de *varios*
productos relacionados que deben usarse juntos". Aquí `FabricaCanalVotacion`
no crea un solo tipo de objeto, crea tres (`Autenticador`,
`ValidadorDeVoto`, `EmisorDeComprobante`), y la garantía del patrón es que
esos tres siempre vienen de la misma fábrica concreta. Esa garantía de
consistencia entre productos relacionados es la diferencia real entre
ambos patrones, no el simple hecho de tener una función que crea objetos.

### Reutilización de lo existente

El código cliente registra cada voto procesado usando
`LoggerCentralizado.obtenerInstancia().registrarVoto(...)`, el Singleton
de auditoría de Semana03, sin modificar ese archivo. Así el canal por el
que entra el voto no rompe la cadena de auditoría existente. Esto queda
probado en `__tests__/abstract-factory.test.js`; esta carpeta no tiene
`demo.js` porque no aportaría cobertura ni evidencia distinta a la que ya
dan las pruebas automatizadas.

**Evidencia:** el código está en los archivos de esta carpeta y las
pruebas que verifican el comportamiento del patrón están en
`__tests__/abstract-factory.test.js`.
