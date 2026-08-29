## Patrón Singleton — qué aporta al proyecto :D

Para SecureBallot decidí aplicar Singleton en tres partes del sistema:
ConfiguracionGlobal, LoggerCentralizado y PoolConexionesDB. La razón por
la que elegí justo estos tres componentes es que en una plataforma de
votación no pueden existir "varias versiones" de ellos funcionando al
mismo tiempo, porque si eso pasa se generan inconsistencias que en un
sistema normal serían molestas, pero en un sistema de votación pueden
ser graves.

Con ConfiguracionGlobal el problema que resuelve es bastante directo: si
cada módulo del sistema (autenticación, conteo, auditoría) tuviera su
propia copia de la configuración —credenciales de BD, API keys,
parámetros generales—, en algún momento una de esas copias se iba a
desactualizar y ahí empiezan los problemas, porque distintas partes de
la plataforma estarían operando con reglas distintas sin que nadie se
diera cuenta hasta que ya fuera tarde. Con Singleton hay una sola fuente
de verdad y todos los módulos consultan lo mismo.

El caso de LoggerCentralizado es el que más me interesó de los tres,
honestamente. Una plataforma de votación necesita poder demostrar qué
pasó durante el proceso, y si hubiera varias instancias del logger
corriendo, el historial quedaría partido entre ellas y ya no se podría
reconstruir con confianza la secuencia real de eventos. Por eso el
logger no solo es Singleton, sino que además encadena cada registro con
un hash del anterior (hashAnterior → hash). Si alguien intenta alterar
un registro después de creado, la cadena deja de cuadrar y
verificarIntegridad() lo detecta. Esto conecta directo con el objetivo
de auditoría que pide el proyecto.

Por último, PoolConexionesDB. Pensando en el escenario de una elección
nacional con miles de personas votando al mismo tiempo, si cada
petición abriera su propia conexión a la base de datos sin ningún
control, la base de datos se podría saturar y el sistema completo se
cae justo cuando más se necesita que funcione. El pool centraliza
cuántas conexiones hay activas y pone en cola las que llegan de más,
lo cual va directo con el objetivo de escalabilidad del proyecto.

Sobre SOLID: siguiendo el principio de Responsabilidad Única, estas
clases terminan asumiendo, además de su función normal, la
responsabilidad de controlar su propia creación (el campo #instancia y
el bloqueo dentro del constructor se encargan de eso). Ahora, hay que
ser honesto y reconocer que esto entra en tensión con Inversión de
Dependencias: al llamar obtenerInstancia() desde cualquier parte del
código, uno termina acoplado a una clase concreta en vez de depender de
una abstracción. Para este proyecto lo tomé como una decisión
consciente: en estos tres casos puntuales el beneficio de tener una
única fuente de verdad pesa más que ese acoplamiento.

**Evidencia:** el código está en singleton-votacion.js y las pruebas que
verifican el comportamiento del patrón están en
__tests__/singleton.test.js.