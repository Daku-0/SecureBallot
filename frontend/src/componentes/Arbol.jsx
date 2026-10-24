export default function Arbol({ nodo, puedeCerrar, onCerrar, ocupada }) {
  if (nodo.tipo === 'mesa') {
    return (
      <li className="nodo nodo-mesa">
        <span className="nodo-nombre">{nodo.nombre}</span>
        <span className={nodo.cerrada ? 'estado estado-cerrada' : 'estado estado-abierta'}>
          {nodo.cerrada ? 'Cerrada' : 'Abierta'}
        </span>
        {puedeCerrar && !nodo.cerrada && (
          <button type="button" className="boton boton-secundario boton-chico" disabled={ocupada}
            onClick={() => onCerrar(nodo.nombre)} aria-label={`Cerrar ${nodo.nombre}`}>
            Cerrar mesa
          </button>
        )}
      </li>
    );
  }
  return (
    <li className="nodo">
      <span className="nodo-nombre">{nodo.nombre}</span> <span className="nodo-nivel">{nodo.nivel}</span>
      <ul>
        {nodo.hijos.map((h) => (
          <Arbol key={`${h.tipo}-${h.nombre}`} nodo={h} puedeCerrar={puedeCerrar} onCerrar={onCerrar} ocupada={ocupada} />
        ))}
      </ul>
    </li>
  );
}
