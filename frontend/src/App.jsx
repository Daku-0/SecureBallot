import { useMemo, useState } from 'react';
import { ApiContext } from './contexto.js';
import { crearApi } from './api.js';
import Credencial from './componentes/Credencial.jsx';
import Votar from './paginas/Votar.jsx';
import Resultados from './paginas/Resultados.jsx';
import Panel from './paginas/Panel.jsx';
import Auditoria from './paginas/Auditoria.jsx';

const PESTANAS = [
  { id: 'votar', etiqueta: 'Votar', Pagina: Votar },
  { id: 'resultados', etiqueta: 'Resultados', Pagina: Resultados },
  { id: 'panel', etiqueta: 'Panel electoral', Pagina: Panel },
  { id: 'auditoria', etiqueta: 'Auditoría', Pagina: Auditoria },
];

function leerSesion() {
  try {
    const guardada = JSON.parse(sessionStorage.getItem('secureballot.sesion'));
    if (guardada?.rol && guardada?.usuario) return guardada;
  } catch { /* sin sesion guardada */ }
  return { rol: 'VOTANTE', usuario: 'demo' };
}

export default function App() {
  const [sesion, setSesionEstado] = useState(leerSesion);
  const [pestana, setPestana] = useState('votar');
  const api = useMemo(() => crearApi(sesion), [sesion]);

  const setSesion = (nueva) => {
    setSesionEstado(nueva);
    try { sessionStorage.setItem('secureballot.sesion', JSON.stringify(nueva)); } catch { /* almacenamiento no disponible */ }
  };
  const { Pagina } = PESTANAS.find((p) => p.id === pestana);

  return (
    <ApiContext.Provider value={api}>
      <header className="cabecera">
        <div className="cabecera-interior">
          <a className="marca" href="/" aria-label="SecureBallot, inicio">
            <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
              <path d="M10 3h12v11H10z" fill="var(--azul)" />
              <rect x="4" y="12" width="24" height="17" rx="2" fill="var(--tinta)" />
              <rect x="11" y="16" width="10" height="3" fill="var(--papel)" />
            </svg>
            <span>SecureBallot</span>
          </a>
          <Credencial sesion={sesion} onCambio={setSesion} />
        </div>
        <nav className="pestanas" aria-label="Secciones">
          {PESTANAS.map((p) => (
            <button key={p.id} type="button" className="pestana"
              aria-current={p.id === pestana ? 'page' : undefined} onClick={() => setPestana(p.id)}>
              {p.etiqueta}
            </button>
          ))}
        </nav>
      </header>
      <main className="contenido">
        <Pagina sesion={sesion} />
      </main>
      <footer className="pie">
        Demostración académica. La credencial es una simulación de roles, no una autenticación real.
      </footer>
    </ApiContext.Provider>
  );
}
