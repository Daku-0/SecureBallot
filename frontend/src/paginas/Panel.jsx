import { useCallback, useEffect, useState } from 'react';
import { useApi } from '../contexto.js';
import Aviso from '../componentes/Aviso.jsx';
import Arbol from '../componentes/Arbol.jsx';

export default function Panel({ sesion }) {
  const api = useApi();
  const [estado, setEstado] = useState(null);
  const [arbol, setArbol] = useState(null);
  const [error, setError] = useState('');
  const [ocupada, setOcupada] = useState(false);
  const [confirmandoReinicio, setConfirmandoReinicio] = useState(false);

  const cargar = useCallback(async () => {
    const [e, j] = await Promise.all([api.get('/api/estado'), api.get('/api/jerarquia')]);
    if (e.ok && j.ok) { setEstado(e.datos); setArbol(j.datos); setError(''); }
    else setError((!e.ok ? e.datos?.mensaje : j.datos?.mensaje) || 'No se pudo cargar la elección');
  }, [api]);

  useEffect(() => { cargar(); }, [cargar]);

  const puedeCerrar = sesion.rol === 'JURADO' || sesion.rol === 'ADMIN_ELECTORAL';

  async function cerrar(nombre) {
    setOcupada(true); setError('');
    const r = await api.post(`/api/mesas/${encodeURIComponent(nombre)}/cerrar`);
    if (!r.ok) setError(r.datos?.mensaje || 'No se pudo cerrar la mesa');
    await cargar();
    setOcupada(false);
  }

  async function reiniciar() {
    setOcupada(true); setError('');
    const r = await api.post('/api/reiniciar');
    if (!r.ok) setError(r.datos?.mensaje || 'No se pudo reiniciar');
    setConfirmandoReinicio(false);
    await cargar();
    setOcupada(false);
  }

  return (
    <section aria-labelledby="titulo-panel">
      <h1 id="titulo-panel">Panel electoral</h1>
      {estado && (
        <p className="lead">
          {estado.eleccion}: <strong>{estado.mesasCerradas} de {estado.totalMesas} mesas cerradas</strong>
          {estado.eleccionCerrada ? '. Los resultados ya están disponibles.' : '. Los resultados se habilitan al cerrar todas.'}
        </p>
      )}
      {!puedeCerrar && <Aviso>Con la credencial «{sesion.rol === 'VOTANTE' ? 'Votante' : 'Auditor'}» solo puedes ver el estado. Para cerrar mesas usa Jurado de mesa o Administrador electoral.</Aviso>}
      {error && <Aviso tipo="error">{error}</Aviso>}
      {arbol && (
        <div className="panel">
          <ul className="arbol">
            <Arbol nodo={arbol} puedeCerrar={puedeCerrar} onCerrar={cerrar} ocupada={ocupada} />
          </ul>
        </div>
      )}
      {sesion.rol === 'ADMIN_ELECTORAL' && (
        <div className="zona-peligro">
          <h2>Reiniciar la demostración</h2>
          <p className="nota">Vuelve a abrir todas las mesas, borra los votos y permite que todos los documentos voten de nuevo. La auditoría se conserva.</p>
          {!confirmandoReinicio ? (
            <button type="button" className="boton boton-secundario" onClick={() => setConfirmandoReinicio(true)}>Reiniciar elección</button>
          ) : (
            <div className="fila">
              <button type="button" className="boton boton-peligro" onClick={reiniciar} disabled={ocupada}>Sí, reiniciar</button>
              <button type="button" className="boton boton-secundario" onClick={() => setConfirmandoReinicio(false)}>Cancelar</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
