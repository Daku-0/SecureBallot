import { useEffect, useState } from 'react';
import { useApi, etiquetaDeRol } from '../contexto.js';
import Aviso from '../componentes/Aviso.jsx';
import Conteo from '../componentes/Conteo.jsx';

function orientacion(codigo, rol) {
  if (codigo === 'ELECCION_ABIERTA') return 'Vuelve cuando todas las mesas estén cerradas. Puedes seguir el avance en el Panel electoral.';
  if (codigo === 'ROL_NO_AUTORIZADO') return `Tu credencial actual es «${etiquetaDeRol(rol)}». Cambia a Auditor o Administrador electoral para consultar los resultados.`;
  return '';
}

export default function Resultados({ sesion }) {
  const api = useApi();
  const [fase, setFase] = useState('inicial');
  const [resultado, setResultado] = useState(null);
  const [denegado, setDenegado] = useState(null);
  const [opciones, setOpciones] = useState({ encabezado: true, firmante: '', marcaAgua: '', observaciones: '' });
  const [reporte, setReporte] = useState(null);
  const [errorReporte, setErrorReporte] = useState('');
  const [canal, setCanal] = useState('email');
  const [destinatario, setDestinatario] = useState('');
  const [publicacion, setPublicacion] = useState(null);

  // Al cambiar de credencial se descarta lo que se habia obtenido con la anterior
  useEffect(() => {
    setFase('inicial'); setResultado(null); setDenegado(null); setReporte(null); setPublicacion(null);
  }, [sesion.rol]);

  async function consultar() {
    setFase('cargando'); setDenegado(null);
    const r = await api.get('/api/resultados');
    if (r.ok) { setResultado(r.datos.datos); setFase('ok'); }
    else { setDenegado({ codigo: r.datos?.codigo, mensaje: r.datos?.mensaje || 'No se pudieron consultar los resultados' }); setFase('denegado'); }
  }

  async function generarReporte(e) {
    e.preventDefault(); setErrorReporte('');
    const r = await api.post('/api/reporte', {
      encabezado: opciones.encabezado, firmante: opciones.firmante, marcaAgua: opciones.marcaAgua,
      observaciones: opciones.observaciones.split('\n').map((l) => l.trim()).filter(Boolean),
    });
    if (r.ok) setReporte(r.datos.datos); else setErrorReporte(r.datos?.mensaje || 'No se pudo generar el reporte');
  }

  function descargar() {
    const blob = new Blob([reporte.texto], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url; enlace.download = 'reporte-resultados.txt'; enlace.click();
    URL.revokeObjectURL(url);
  }

  async function publicar(e) {
    e.preventDefault(); setPublicacion(null);
    const r = await api.post('/api/publicar', { canal, destinatario });
    setPublicacion(r.ok ? { ok: true, texto: r.datos.datos.aviso } : { ok: false, texto: r.datos?.mensaje || 'No se pudo avisar' });
  }

  return (
    <section aria-labelledby="titulo-resultados">
      <h1 id="titulo-resultados">Resultados</h1>
      <p className="lead">Se publican cuando todas las mesas están cerradas y solo los ven auditores y administradores. Cada consulta queda en la auditoría.</p>
      <button type="button" className="boton" onClick={consultar} disabled={fase === 'cargando'}>
        {fase === 'cargando' ? 'Consultando…' : 'Consultar resultados'}
      </button>

      {fase === 'denegado' && (
        <Aviso tipo="error">
          <strong>{denegado.mensaje}</strong>
          {orientacion(denegado.codigo, sesion.rol) && <span> {orientacion(denegado.codigo, sesion.rol)}</span>}
        </Aviso>
      )}

      {fase === 'ok' && (
        <>
          <div className="panel">
            <dl className="resumen">
              <div><dt>Votos emitidos</dt><dd>{resultado.totalVotos.toLocaleString('es-CO')}</dd></div>
              <div><dt>Mesas</dt><dd>{resultado.totalMesas}</dd></div>
              <div><dt>Resultado</dt><dd>{resultado.ganador === 'EMPATE' ? 'Empate' : resultado.ganador ?? 'Sin votos'}</dd></div>
            </dl>
            {resultado.totalVotos > 0 && <Conteo votosPorCandidato={resultado.votosPorCandidato} ganador={resultado.ganador} />}
          </div>

          <h2>Reporte oficial</h2>
          <form className="panel" onSubmit={generarReporte}>
            <label className="radio"><input type="checkbox" checked={opciones.encabezado} onChange={(e) => setOpciones({ ...opciones, encabezado: e.target.checked })} /> Encabezado institucional</label>
            <label className="campo"><span>Firmante (agrega firma y huella de integridad)</span>
              <input value={opciones.firmante} maxLength={80} onChange={(e) => setOpciones({ ...opciones, firmante: e.target.value })} /></label>
            <label className="campo"><span>Marca de agua</span>
              <input value={opciones.marcaAgua} maxLength={30} placeholder="Ej. COPIA" onChange={(e) => setOpciones({ ...opciones, marcaAgua: e.target.value })} /></label>
            <label className="campo"><span>Observaciones (una por línea)</span>
              <textarea rows={3} value={opciones.observaciones} onChange={(e) => setOpciones({ ...opciones, observaciones: e.target.value })} /></label>
            <button type="submit" className="boton">Generar reporte</button>
          </form>
          {errorReporte && <Aviso tipo="error">{errorReporte}</Aviso>}
          {reporte && (
            <div className="reporte">
              <p className="nota">{reporte.descripcion}</p>
              <pre aria-label="Texto del reporte">{reporte.texto}</pre>
              <button type="button" className="boton boton-secundario" onClick={descargar}>Descargar .txt</button>
            </div>
          )}

          {sesion.rol === 'ADMIN_ELECTORAL' && (
            <>
              <h2>Avisar resultados</h2>
              <form className="panel" onSubmit={publicar}>
                <label className="campo"><span>Canal</span>
                  <select value={canal} onChange={(e) => setCanal(e.target.value)}>
                    <option value="email">Correo electrónico</option><option value="sms">SMS</option><option value="push">Notificación push</option>
                  </select></label>
                <label className="campo"><span>Destinatario</span>
                  <input value={destinatario} maxLength={80} required onChange={(e) => setDestinatario(e.target.value)} /></label>
                <button type="submit" className="boton">Avisar resultados</button>
              </form>
              {publicacion && <Aviso tipo={publicacion.ok ? 'exito' : 'error'}>{publicacion.texto}</Aviso>}
            </>
          )}
        </>
      )}
    </section>
  );
}
