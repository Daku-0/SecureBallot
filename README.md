# SecureBallot
Plataforma de votación electrónica segura y escalable, diseñada para gestionar procesos electorales digitales con autenticación robusta, conteo automatizado y verificable, auditoría integral y capacidad para soportar elecciones de gran escala.

## Ejecución

Requiere Node.js (con npm).

```bash
npm install
npm test
```

`npm test` corre con Jest todas las suites del proyecto (patrones creacionales y estructurales) desde la raíz del repositorio. No se necesita ninguna variable de entorno ni configuración adicional: cada suite que la requiere define internamente las variables antes de correr.

Para ejecutar una sola carpeta:

```bash
npx jest Semana10_Proxy
```

La medición de memoria del patrón Flyweight no forma parte de `npm test`; se ejecuta aparte (el argumento opcional es la cantidad de mesas, por defecto 50000):

```bash
node --expose-gc Semana10_Flyweight/medir-memoria.js 50000
```

## Estructura por patrón

| Carpeta | Patrón | Tipo | Rol en SecureBallot |
|---|---|---|---|
| `Semana03/` | Singleton | Creacional | `ConfiguracionGlobal`, `LoggerCentralizado` (auditoría encadenada por hash) y `PoolConexionesDB` |
| `Semana04_PFM/` | Factory Method | Creacional | Generación de reportes de la elección |
| `Semana04_Abstract_Factory/` | Abstract Factory | Creacional | Familia de componentes de cada canal de votación (presencial o virtual) |
| `Semana05_builder/` | Builder | Creacional | Construcción paso a paso de la configuración de una elección |
| `Semana05_Prototype/` | Prototype | Creacional | Plantillas de elección clonables |
| `Semana07_Adapter/` | Adapter | Estructural | Verificación de identidad contra un padrón electoral externo |
| `Semana07_Bridge/` | Bridge | Estructural | Notificaciones (qué se avisa) desacopladas del canal (email, SMS, push) |
| `Semana08_Composite/` | Composite | Estructural | Jerarquía País → Departamento → Municipio → Puesto → Mesa con conteo recursivo |
| `Semana08_Decorator/` | Decorator | Estructural | Reporte de resultados con encabezado, firma con huella SHA-256, marca de agua y observaciones |
| `Semana09_Facade/` | Facade | Estructural | Único punto de entrada al proceso de votación (`emitirVoto`) |
| `Semana10_Flyweight/` | Flyweight | Estructural | Catálogo de candidatos compartido entre los tarjetones de todas las mesas |
| `Semana10_Proxy/` | Proxy | Estructural | Control de acceso, caché y creación diferida del servicio de resultados |

Cada carpeta tiene su propio `README.md` con la justificación del patrón y su carpeta `__tests__/` con las pruebas automatizadas correspondientes.

## Cómo se conectan los patrones

Los patrones estructurales no son piezas aisladas: se apoyan en los anteriores y forman un solo flujo.

```
Votar         ProcesoVotacionFacade                                   (Facade)
                ├─ VerificadorIdentidadAdapter ─► padrón externo      (Adapter)
                ├─ FabricaCanalVotacion: presencial | virtual         (Abstract Factory)
                ├─ RegistroVotantes: un voto por persona
                └─ UrnaElectronica ─► MesaVotacion dentro de          (Composite)
                                      UnidadElectoral

Resultados    Proxy de protección ─► Proxy de caché ─►                (Proxy)
              Proxy virtual ─► ServicioResultadosReal ─► Composite

Reportes      ReporteResultadosBase + decoradores                     (Decorator)
Avisos        Notificacion* + CanalEmail | CanalSMS | CanalPush       (Bridge)
Tarjetones    Tarjeton + FabricaCandidatos (Candidato compartido)     (Flyweight)

Auditoría     LoggerCentralizado: lo usan todos los patrones          (Singleton)
```

`Semana10_Proxy/__tests__/integracion.test.js` recorre este flujo completo: votar por la fachada, contar, consultar con control de acceso, generar el reporte decorado y avisar por el Bridge.

Las carpetas se importan entre sí con rutas relativas (por ejemplo `../Semana03/singleton-votacion`), por lo que conviene no renombrarlas.

## Decisiones de diseño relevantes

- **Secreto del voto.** Las mesas solo cuentan votos por candidato. El registro de quién ya votó guarda únicamente una huella con sal, y la auditoría del voto contiene un identificador anónimo y la mesa, nunca el documento ni el candidato.
- **Sin resultados parciales.** El servicio de resultados rechaza toda consulta mientras haya mesas abiertas, incluso a roles autorizados, y audita cada intento permitido o denegado.
- **Integridad del conteo.** La jerarquía electoral impide que un nodo tenga dos padres (se contarían sus votos dos veces) y que existan ciclos.
- **Caché segura.** El resultado solo se guarda cuando todas las mesas están cerradas y ya no puede cambiar.
- **Alcance de Flyweight.** Se aplica al catálogo de candidatos y no a los votos: cada voto es único y compartirlo comprometería el secreto. Su beneficio depende de la escala y se puede medir con `medir-memoria.js`.
