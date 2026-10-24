import { useEffect, useRef, useState } from 'react';
import { useApi, nombreVisible } from '../contexto.js';
import Tarjeton from '../componentes/Tarjeton.jsx';
import Aviso from '../componentes/Aviso.jsx';

const URNA_VIRTUAL = 'URNA-VIRTUAL';
const nuevoIdDispositivo = () => {
  try { return crypto.randomUUID(); } catch { return `web-${Math.random().toString(36).slice(2, 12)}`; }
};

export default function Votar({ sesion }) {
  const api = useApi();
  const dispositivo = useRef(nuevoIdDispositivo());
  const [canal, setCanal] = useState('presencial');
  const [mesas, setMesas] = useState([]);
  const [mesa, setMesa] = useState('');
  const [tarjeton, setTarjeton] = useState(null);
  const [documento, setDocumento] = useState('');
  const [otp, setOtp] = useState('');
  const [smsDemo, setSmsDemo] = useState('');
  const [seleccion, setSeleccion] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [errorCarga, setErrorCarga] = useState('');
  const [recibo, setRecibo] = useState(null);

  // Mesas presenciales que siguen abiertas
  useEffect(() => {
    let activo = true;
    api.get('/api/estado').then((r) => {
      if (!activo) return;
      if (!r.ok) { setErrorCarga(r.datos?.mensaje || 'No se pudo cargar el estado de la elección'); return; }
      const abiertas = r.datos.mesas.filter((m) => !m.virtual && !m.cerrada).map((m) => m.nombre);
      setMesas(abiertas);
      setMesa((previa) => (abiertas.includes(previa) ? previa : abiertas[0] || ''));
    });
    return () => { activo = false; };
  }, [api, recibo]);

  const mesaDelTarjeton = canal === 'virtual' ? URNA_VIRTUAL : mesa;
  useEffect(() => {
    if (!mesaDelTarjeton) { setTarjeton(null); return undefined; }
    let activo = true;
    api.get(`/api/tarjeton?mesa=${encodeURIComponent(mesaDelTarjeton)}`).then((r) => {
      if (!activo) return;
      if (r.ok) { setTarjeton(r.datos); setErrorCarga(''); } else { setTarjeton(null); setErrorCarga(r.datos?.mensaje || 'No se pudo cargar el tarjetón'); }
    });
    return () => { activo = false; };
  }, [api, mesaDelTarjeton]);

  const documentoValido = /^\d{6,12}$/.test(documento);
  const bloqueadoPorRol = canal === 'presencial' && sesion.rol !== 'JURADO';
  const identificado = canal === 'presencial' ? Boolean(mesa) : /^\d{6}$/.test(otp);
  const puedeRevisar = documentoValido && identificado && Boolean(seleccion) && Boolean(tarjeton) && !bloqueadoPorRol;

  async function pedirCodigo() {
    setError('');
    const r = await api.post('/api/otp', { documento });
    if (r.ok) setSmsDemo(r.datos.datos.demoSms); else setError(r.datos?.mensaje || 'No se pudo enviar el código');
  }

  async function depositar() {
    setEnviando(true); setError('');
    const r = await api.post('/api/votos', {
      canal, documento, candidato: seleccion,
      mesa: canal === 'presencial' ? mesa : undefined,
      otp: canal === 'virtual' ? otp : undefined,
      dispositivoId: dispositivo.current,
    });
    setEnviando(false);
    if (r.ok) setRecibo(r.datos.datos);
    else { setConfirmando(false); setError(r.datos?.mensaje || 'No se pudo registrar el voto'); }
  }

  function otroVoto() {
    setRecibo(null); setDocumento(''); setOtp(''); setSmsDemo(''); setSeleccion(''); setConfirmando(false); setError('');
  }

  if (recibo) {
    return (
      <section className="comprobante" aria-labelledby="titulo-comprobante">
        <div className="sello" aria-hidden="true"><span>Voto registrado</span></div>
        <h1 id="titulo-comprobante">Tu voto quedó registrado</h1>
        <p className="lead">{recibo.comprobante.contenido}</p>
        <dl className="datos">
          <dt>Código anónimo</dt><dd>{recibo.idVotoAnonimo}</dd>
          <dt>Canal</dt><dd>{recibo.comprobante.canal === 'virtual' ? 'Virtual' : 'Presencial'}</dd>
        </dl>
        <p className="nota">Este código no está asociado a tu identidad: no permite saber quién emitió el voto.</p>
        <button type="button" className="boton boton-secundario" onClick={otroVoto}>Registrar otro voto</button>
      </section>
    );
  }

  return (
    <section aria-labelledby="titulo-votar">
      <h1 id="titulo-votar">Emitir voto</h1>
      <p className="lead">Elige el canal, identifícate y marca el tarjetón. Una vez depositado, el voto no se puede cambiar.</p>
      <form className="votar" onSubmit={(e) => { e.preventDefault(); if (puedeRevisar) setConfirmando(true); }}>
        <div className="panel">
          <fieldset className="campos">
            <legend>Canal</legend>
            <label className="radio"><input type="radio" name="canal" checked={canal === 'presencial'} onChange={() => { setCanal('presencial'); setConfirmando(false); }} /> Presencial</label>
            <label className="radio"><input type="radio" name="canal" checked={canal === 'virtual'} onChange={() => { setCanal('virtual'); setConfirmando(false); }} /> Virtual</label>
          </fieldset>

          <div className="campo">
            <label htmlFor="documento"><span>Documento de identidad</span></label>
            <input id="documento" inputMode="numeric" autoComplete="off" value={documento} placeholder="Ej. 1098765432"
              aria-describedby="ayuda-documento"
              onChange={(e) => setDocumento(e.target.value.replace(/\D/g, '').slice(0, 12))} />
            <small id="ayuda-documento">Demo: los documentos que empiezan por 9 no están en el padrón.</small>
          </div>

          {canal === 'presencial' ? (
            <>
              <label className="campo">
                <span>Mesa</span>
                <select value={mesa} onChange={(e) => { setMesa(e.target.value); setConfirmando(false); }}>
                  {mesas.length === 0 && <option value="">No hay mesas abiertas</option>}
                  {mesas.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              {bloqueadoPorRol && (
                <Aviso>El voto presencial lo habilita el jurado de la mesa. Cambia la credencial a «Jurado de mesa» para continuar.</Aviso>
              )}
            </>
          ) : (
            <div className="campo">
              <span>Código de verificación</span>
              <div className="fila">
                <input aria-label="Código de verificación" inputMode="numeric" autoComplete="one-time-code" value={otp} placeholder="6 dígitos"
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                <button type="button" className="boton boton-secundario" disabled={!documentoValido} onClick={pedirCodigo}>Enviar código</button>
              </div>
              {smsDemo && <small className="sms-demo">SMS de demostración: {smsDemo}</small>}
            </div>
          )}
        </div>

        <div>
          {tarjeton
            ? <Tarjeton tarjeton={tarjeton} seleccion={seleccion} onSeleccion={(v) => { setSeleccion(v); setConfirmando(false); }} deshabilitado={enviando} />
            : <p className="nota">{mesaDelTarjeton ? 'Cargando tarjetón…' : 'Selecciona una mesa abierta para ver el tarjetón.'}</p>}
        </div>

        <div className="acciones">
          {errorCarga && <Aviso tipo="error">{errorCarga}</Aviso>}
          {error && <Aviso tipo="error">{error}</Aviso>}
          {!confirmando ? (
            <button type="submit" className="boton" disabled={!puedeRevisar}>Revisar voto</button>
          ) : (
            <div className="confirmacion" role="group" aria-label="Confirmar voto">
              <p>
                Vas a depositar tu voto por <strong>{nombreVisible(seleccion)}</strong>{' '}
                en <strong>{canal === 'virtual' ? 'la urna virtual' : mesa}</strong>. Esta acción no se puede deshacer.
              </p>
              <div className="fila">
                <button type="button" className="boton" onClick={depositar} disabled={enviando}>{enviando ? 'Depositando…' : 'Depositar voto'}</button>
                <button type="button" className="boton boton-secundario" onClick={() => setConfirmando(false)} disabled={enviando}>Volver</button>
              </div>
            </div>
          )}
        </div>
      </form>
    </section>
  );
}
