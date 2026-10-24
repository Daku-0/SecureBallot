# Frontend — Interfaz de SecureBallot (React + Vite)

Interfaz de una sola página que consume la API del backend. No contiene reglas de negocio: todo permiso, validación y conteo se decide en el servidor; la interfaz solo las presenta.

## Requisitos

Node **22.22 o superior** (para las pruebas; compilar funciona desde 20.19).

## Ejecutar

**Desarrollo** (dos terminales):

```bash
node backend/server.js            # API en :3001
cd frontend && npm install && npm run dev    # http://localhost:5173 (reenvía /api al backend)
```

**Producción** (un solo servidor):

```bash
cd frontend && npm install && npm run build
cd .. && node backend/server.js   # http://localhost:3001 sirve la app y la API
```

**Pruebas:** `cd frontend && npm test` (25 pruebas; usan un servidor simulado, no necesitan el backend).
Los archivos `*.vtest.jsx` tienen esa extensión a propósito para que el Jest de la raíz no los ejecute.

## Pantallas

| Pantalla        | Qué muestra                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------- |
| Votar           | Canal presencial o virtual, tarjetón, paso de revisión antes de depositar, comprobante con sello |
| Resultados      | Conteo con rayitas de escrutinio, reporte con Decorators, aviso por Bridge (solo administrador)    |
| Panel electoral | Árbol Composite con estado de cada mesa, cierre de mesas, reinicio de la demo                     |
| Auditoría      | Bitácora y verificación de integridad de la cadena de huellas                                    |

## Credencial simulada

El selector «Rol» de la cabecera envía `x-rol` y `x-usuario` en cada petición. Sirve para recorrer los distintos permisos; **no es autenticación** (ver `backend/README.md`).

## Decisiones de diseño

- El tarjetón usa botones de radio nativos: funciona con teclado y lectores de pantalla.
- Depositar exige un paso de confirmación porque el voto es irreversible.
- Al cambiar de rol se descartan los resultados ya consultados con el rol anterior.
- Hasta 60 votos por candidato se dibujan como rayitas; por encima, como barra proporcional.
- Respeta modo oscuro (`prefers-color-scheme`) y reducción de movimiento (`prefers-reduced-motion`).
