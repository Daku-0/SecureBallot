# SecureBallot
Plataforma de votación electrónica segura y escalable, diseñada para gestionar procesos electorales digitales con autenticación robusta, conteo automatizado y verificable, auditoría integral y capacidad para soportar elecciones de gran escala.

## Ejecución

Requiere Node.js (con npm).

```bash
npm install
npm test
```

`npm test` corre con Jest todas las suites del proyecto (Singleton, Factory Method, Abstract Factory, Builder y Prototype) desde la raíz del repositorio. No se necesita ninguna variable de entorno ni configuración adicional: cada suite que la requiere (Singleton) la define internamente antes de correr.

## Estructura por patrón

| Carpeta | Patrón |
|---|---|
| `Semana03/` | Singleton |
| `Semana04_PFM/` | Factory Method |
| `Semana04_Abstract_Factory/` | Abstract Factory |
| `Semana05_builder/` | Builder |
| `Semana05_Prototype/` | Prototype |

Cada carpeta tiene su propio `README.md` con la justificación del patrón y su carpeta `__tests__/` con las pruebas automatizadas correspondientes.
