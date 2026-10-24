# Proxy — Servicio de resultados

## Por qué este patrón
Consolidar los resultados es costoso y sensible: no cualquiera debe consultarlos, no deben verse conteos parciales mientras la elección siga abierta, conviene no recalcularlos y cada intento debe quedar auditado. Proxy aplica esas reglas delante del servicio real, sin mezclarlas con el cálculo.

## Participantes
| Ingrediente | Clase | Archivo |
|---|---|---|
| Subject | `ServicioResultados` | `servicio-resultados.js` |
| RealSubject | `ServicioResultadosReal` | `servicio-resultados-real.js` |
| Protection Proxy | `ProxyProteccionResultados` | `proxy-proteccion.js` |
| Caching Proxy | `ProxyCacheResultados` | `proxy-cache.js` |
| Virtual Proxy | `ProxyVirtualResultados` | `proxy-virtual.js` |
| Composición de la cadena | `crearServicioResultados` | `crear-servicio-resultados.js` |

Cadena: **Protección → Caché → Virtual → Real**. La protección deniega antes de hacer cualquier trabajo y un acierto de caché ni siquiera toca al servicio real.

## Reglas
- Roles permitidos por defecto: `AUDITOR` y `ADMIN_ELECTORAL` (configurables).
- Se comprueba primero el rol y después el estado, para no revelar el estado de la elección a quien no tiene derecho a consultarla.
- Mientras haya mesas abiertas nadie ve resultados (`ErrorAccesoResultados` con código `ELECCION_ABIERTA` o `ROL_NO_AUTORIZADO`).
- La caché solo guarda cuando todas las mesas están cerradas; el servicio real se crea de forma realmente diferida.
- El resultado compartido está congelado. El ganador excluye el voto en blanco y detecta empates.
- Cada intento, permitido o denegado, queda en el `LoggerCentralizado` con usuario, rol y motivo.

## Uso
```js
const servicio = crearServicioResultados({ raiz, usuario: 'aud1', rol: 'AUDITOR' });
servicio.consultar(); // ErrorAccesoResultados mientras haya mesas abiertas
// ... se cierran todas las mesas ...
servicio.consultar(); // { totalVotos, totalMesas, votosPorCandidato, ganador }
```

## Pruebas
- `__tests__/proxy.test.js` (17 pruebas): consolidación, interfaz común, protección por rol y estado, auditoría, creación diferida, caché segura, resultado congelado y cadena completa.
- `__tests__/integracion.test.js` (4 pruebas): flujo completo de las semanas 7 a 10 (Facade, Adapter, Abstract Factory, Composite, Proxy, Decorator y Bridge).
