import Rayitas from './Rayitas.jsx';
import { nombreVisible } from '../contexto.js';

const MAX_RAYITAS = 60; // por encima de esto el dibujo deja de ser legible y se usa una barra proporcional

export default function Conteo({ votosPorCandidato, ganador }) {
  const filas = Object.entries(votosPorCandidato).sort(([, a], [, b]) => b - a);
  const total = filas.reduce((suma, [, v]) => suma + v, 0);
  return (
    <ol className="conteo">
      {filas.map(([clave, votos]) => {
        const pct = total === 0 ? 0 : (votos * 100) / total;
        return (
          <li key={clave} className={clave === ganador ? 'fila-conteo ganador' : 'fila-conteo'}>
            <div className="fila-cabecera">
              <span className="fila-nombre">{nombreVisible(clave)}</span>
              {clave === ganador && <span className="etiqueta-ganador">Más votado</span>}
              <span className="fila-cifra">{votos.toLocaleString('es-CO')}</span>
              <span className="fila-pct">{pct.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %</span>
            </div>
            {votos <= MAX_RAYITAS
              ? <Rayitas votos={votos} />
              : <div className="barra" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>}
          </li>
        );
      })}
    </ol>
  );
}
