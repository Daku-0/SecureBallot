import { nombreVisible } from '../contexto.js';

/**
 * El tarjeton: papel con talon perforado y una casilla por opcion.
 * Cada opcion es un radio nativo (accesible por teclado) dibujado como casilla.
 */
export default function Tarjeton({ tarjeton, seleccion, onSeleccion, deshabilitado }) {
  const opciones = [
    ...tarjeton.opciones.map((o) => ({ ...o, valor: o.nombre })),
    { posicion: null, codigo: 'BLANCO', nombre: 'Voto en blanco', partido: null, propuesta: null, valor: tarjeton.votoBlanco },
  ];
  return (
    <fieldset className="tarjeton" disabled={deshabilitado}>
      <legend className="tarjeton-titulo">Tarjetón · {tarjeton.mesa === 'URNA-VIRTUAL' ? 'urna virtual' : tarjeton.mesa}</legend>
      <p className="tarjeton-ayuda">Marca una sola opción.</p>
      {opciones.map((o) => (
        <label key={o.codigo} className={`opcion${seleccion === o.valor ? ' marcada' : ''}`}>
          <input type="radio" name="candidato" value={o.valor}
            checked={seleccion === o.valor} onChange={() => onSeleccion(o.valor)} />
          <span className="opcion-posicion" aria-hidden="true">{o.posicion ?? '–'}</span>
          <span className="opcion-datos">
            <span className="opcion-nombre">{nombreVisible(o.nombre)}</span>
            {o.partido && <span className="opcion-partido">{o.partido}</span>}
            {o.propuesta && <span className="opcion-propuesta">{o.propuesta}</span>}
          </span>
          <span className="casilla" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" /></svg>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
