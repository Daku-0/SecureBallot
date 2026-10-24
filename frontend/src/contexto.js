import { createContext, useContext } from 'react';

export const ApiContext = createContext(null);
export const useApi = () => useContext(ApiContext);

export const ROLES = [
  { valor: 'VOTANTE', etiqueta: 'Votante' },
  { valor: 'JURADO', etiqueta: 'Jurado de mesa' },
  { valor: 'AUDITOR', etiqueta: 'Auditor' },
  { valor: 'ADMIN_ELECTORAL', etiqueta: 'Administrador electoral' },
];
export const etiquetaDeRol = (valor) => ROLES.find((r) => r.valor === valor)?.etiqueta ?? valor;
export const nombreVisible = (clave) => (clave === 'VOTO_BLANCO' ? 'Voto en blanco' : clave);
