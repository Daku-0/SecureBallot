# Composite — Jerarquía electoral

## Por qué este patrón
Una elección nacional se cuenta en mesas que pertenecen a puestos, municipios, departamentos y al país. Composite permite consolidar votos en cualquier nivel con la misma operación, sin condicionales por tipo de nodo, y escalar agregando nodos sin modificar el código cliente.

## Participantes
| Ingrediente | Clase | Archivo |
|---|---|---|
| Component | `ElementoElectoral` | `elemento-electoral.js` |
| Leaf | `MesaVotacion` | `mesa-votacion.js` |
| Composite | `UnidadElectoral` (con atributo `nivel`) | `unidad-electoral.js` |

Variante segura: `agregar()` y `eliminar()` existen solo en la rama, porque una mesa no puede tener hijos.

## Reglas de integridad del dominio
- Un nodo no puede tener dos padres (sus votos se contarían dos veces).
- No se permiten ciclos.
- Una unidad sin mesas no cuenta como cerrada.
- La mesa cuenta votos por candidato y nunca guarda quién votó.

## Uso
```js
const pais = new UnidadElectoral('Colombia', 'Nacional');
const mesa1 = new MesaVotacion('Mesa 1');
pais.agregar(new UnidadElectoral('Santander', 'Departamento').agregar(mesa1));

mesa1.registrarVoto('Ana');
pais.getTotalVotos();  // 1, la misma llamada que mesa1.getTotalVotos()
pais.getResultados();  // { Ana: 1 }
```

## Pruebas
`__tests__/composite.test.js` (16 pruebas): contrato común, totales recursivos, uniformidad, consolidación por candidato, `todasCerradas`, `buscarMesa`, ciclos, doble padre, eliminar y reubicar, y auditoría.

## Relación con otros patrones
Es la base de `UrnaElectronica` (Facade), de `ReporteResultadosBase.desdeElemento()` (Decorator) y de `ServicioResultadosReal` (Proxy).
