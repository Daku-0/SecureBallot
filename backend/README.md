# Backend — API de SecureBallot

Capa HTTP (Node.js puro, sin framework) que expone los patrones de las semanas 3 a 10. Existe porque los patrones usan `crypto` y no pueden ejecutarse en el navegador: el frontend solo habla con esta API.

## Ejecutar
```bash
node backend/server.js          # http://localhost:3001  (PORT=4000 para cambiar el puerto)
npx jest backend                # 39 pruebas
```
Si existe `frontend/dist`, el mismo servidor la sirve; si no, solo expone `/api`.

## Dónde está cada patrón
| Archivo | Papel |
|---|---|
| `eleccion.js` | Raíz de composición: arma Composite, Flyweight, Facade (x2 canales) y la cadena de Proxy |
| `rutas.js` | Endpoints; cada uno delega en el patrón correspondiente |
| `notificacion-codigo.js` | Nuevo `RefinedAbstraction` del **Bridge**: agrega el aviso de código OTP sin tocar código existente (OCP) |
| `almacen-otp.js` | Códigos de 6 dígitos, vigencia 5 min, 5 intentos, un solo uso |
| `identidad.js` | Rol simulado por cabeceras `x-rol` / `x-usuario` |

## Endpoints
| Método y ruta | Quién | Qué hace |
|---|---|---|
| `GET /api/estado` | Todos | Mesas y avance de cierre |
| `GET /api/jerarquia` | Todos | Árbol Composite (sin conteos) |
| `GET /api/tarjeton?mesa=` | Todos | Candidatos (Flyweight) |
| `POST /api/otp` | Todos | Emite código para voto virtual |
| `POST /api/votos` | Presencial: JURADO · Virtual: OTP válido | Emite el voto vía Facade |
| `POST /api/mesas/:nombre/cerrar` | JURADO, ADMIN_ELECTORAL | Cierra la mesa |
| `GET /api/resultados` | AUDITOR, ADMIN_ELECTORAL, con todas las mesas cerradas | Cadena de Proxy |
| `POST /api/reporte` | Igual que resultados | Aplica Decorators (encabezado, firma, marca de agua, notas) |
| `POST /api/publicar` | ADMIN_ELECTORAL | Avisa resultados vía Bridge |
| `GET /api/auditoria?limite=` | AUDITOR, ADMIN_ELECTORAL | Bitácora (documentos enmascarados) + verificación de la cadena hash |
| `POST /api/reiniciar` | ADMIN_ELECTORAL | Vuelve al estado inicial de la demo |

## Límites (por ser un proyecto académico)
- **La identidad es simulada**: cualquiera puede enviar `x-rol: ADMIN_ELECTORAL`. Sirve para demostrar el Proxy de protección, no es autenticación. En producción habría que usar tokens firmados (p. ej. JWT) emitidos tras autenticar al usuario.
- El estado vive en memoria; reiniciar el proceso reinicia la elección.
- El código OTP se devuelve en la respuesta (`demoSms`) porque no hay proveedor real de SMS.
