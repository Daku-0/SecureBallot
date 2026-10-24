import { useCallback, useEffect, useState } from 'react';
import { useApi } from '../contexto.js';
import Aviso from '../componentes/Aviso.jsx';

const detalle = (contexto) => Object.entries(contexto || {}).map(([k, v]) => `${k}: ${v}`).join(' · ');

export default function Auditoria({ sesion }) {
  const api = useApi();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const r = await api.get('/api/auditoria?limite=100');
    if (r.ok) { setDatos(r.datos.datos); setError(''); }
    else { setDatos(null); setError(r.datos?.mensaje || 'No se pudo cargar la auditoría'); }
    setCargando(false);
  }, [api]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <section aria-labelledby="titulo-auditoria">
      <h1 id="titulo-auditoria">Auditoría</h1>
      <p className="lead">Cada evento guarda la huella del anterior. Si alguien altera una entrada, la verificación de la cadena falla.</p>
      {error && <Aviso tipo="error">{error}{sesion.rol !== 'AUDITOR' && sesion.rol !== 'ADMIN_ELECTORAL' ? ' Cambia la credencial a Auditor o Administrador electoral.' : ''}</Aviso>}
      {datos && (
        <>
          <div className={datos.integra ? 'integridad integridad-ok' : 'integridad integridad-mal'} role="status">
            <strong>{datos.integra ? 'Cadena íntegra' : 'Cadena alterada'}</strong>
            <span>{datos.total} entradas verificadas · se muestran las {datos.entradas.length} más recientes</span>
          </div>
          <div className="tabla-scroll">
            <table>
              <thead><tr><th>Hora</th><th>Nivel</th><th>Evento</th><th>Detalle</th><th>Huella</th></tr></thead>
              <tbody>
                {datos.entradas.map((e) => (
                  <tr key={e.hash}>
                    <td>{new Date(e.timestamp).toLocaleTimeString('es-CO')}</td>
                    <td><span className={`nivel nivel-${e.nivel.toLowerCase()}`}>{e.nivel}</span></td>
                    <td>{e.mensaje}</td>
                    <td className="detalle">{detalle(e.contexto)}</td>
                    <td title={e.hash}>{e.hash.slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <button type="button" className="boton boton-secundario" onClick={cargar} disabled={cargando}>
        {cargando ? 'Verificando…' : 'Verificar de nuevo'}
      </button>
    </section>
  );
}
