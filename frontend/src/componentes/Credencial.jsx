import { ROLES } from '../contexto.js';

export default function Credencial({ sesion, onCambio }) {
  return (
    <div className="credencial" role="group" aria-label="Credencial de la sesión">
      <label>
        <span>Rol</span>
        <select value={sesion.rol} onChange={(e) => onCambio({ ...sesion, rol: e.target.value })}>
          {ROLES.map((r) => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
        </select>
      </label>
      <label>
        <span>Nombre</span>
        <input type="text" value={sesion.usuario} maxLength={40}
          onChange={(e) => onCambio({ ...sesion, usuario: e.target.value })} />
      </label>
    </div>
  );
}
