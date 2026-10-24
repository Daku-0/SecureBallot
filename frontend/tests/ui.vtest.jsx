import { describe, test, expect } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';
import Rayitas from '../src/componentes/Rayitas.jsx';
import { crearApi } from '../src/api.js';
import { simularApi, ESTADO, tarjetonDe, ARBOL } from './ayudas.js';

const rutasBase = () => ({
  'GET /api/estado': { json: ESTADO },
  'GET /api/tarjeton': ({ url }) => ({ json: tarjetonDe(decodeURIComponent(url.split('mesa=')[1])) }),
});

async function cambiarRol(usuario, etiqueta) {
  await usuario.selectOptions(screen.getByLabelText('Rol'), etiqueta);
}

describe('App', () => {
  test('muestra la marca, las cuatro secciones y navega entre ellas', async () => {
    simularApi(rutasBase());
    const usuario = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('link', { name: /SecureBallot/ })).toBeInTheDocument();
    for (const nombre of ['Votar', 'Resultados', 'Panel electoral', 'Auditoría']) {
      expect(screen.getByRole('button', { name: nombre })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Votar' })).toHaveAttribute('aria-current', 'page');

    await usuario.click(screen.getByRole('button', { name: 'Resultados' }));
    expect(screen.getByRole('heading', { name: 'Resultados' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resultados' })).toHaveAttribute('aria-current', 'page');
  });

  test('envia el rol y el usuario de la credencial en cada peticion', async () => {
    const llamadas = simularApi(rutasBase());
    const usuario = userEvent.setup();
    render(<App />);
    await screen.findByText('Ana Pérez');
    await cambiarRol(usuario, 'Jurado de mesa');
    await waitFor(() => expect(llamadas.at(-1).cabeceras['x-rol']).toBe('JURADO'));
    expect(llamadas.at(-1).cabeceras['x-usuario']).toBe('demo');
  });
});

describe('Votar', () => {
  test('el votante no puede habilitar un voto presencial: se le explica que lo autoriza el jurado', async () => {
    simularApi(rutasBase());
    render(<App />);
    expect(await screen.findByText(/lo habilita el jurado de la mesa/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revisar voto' })).toBeDisabled();
  });

  test('flujo presencial con jurado: marcar, revisar, confirmar y recibir el comprobante', async () => {
    const llamadas = simularApi({
      ...rutasBase(),
      'POST /api/votos': { status: 201, json: { exito: true, datos: { idVotoAnonimo: 'abc-123', comprobante: { canal: 'presencial', formato: 'digital', contenido: 'Comprobante de la mesa 1' } } } },
    });
    const usuario = userEvent.setup();
    render(<App />);
    await cambiarRol(usuario, 'Jurado de mesa');
    await screen.findByText('Ana Pérez');

    await usuario.type(screen.getByLabelText('Documento de identidad'), '1098765432');
    expect(screen.getByRole('button', { name: 'Revisar voto' })).toBeDisabled(); // falta marcar
    await usuario.click(screen.getByRole('radio', { name: /Ana Pérez/ }));
    await usuario.click(screen.getByRole('button', { name: 'Revisar voto' }));

    const confirmacion = screen.getByRole('group', { name: 'Confirmar voto' });
    expect(within(confirmacion).getByText('Ana Pérez')).toBeInTheDocument();
    expect(confirmacion).toHaveTextContent('no se puede deshacer');
    expect(llamadas.some((l) => l.metodo === 'POST')).toBe(false); // todavia no se envio nada

    await usuario.click(screen.getByRole('button', { name: 'Depositar voto' }));
    expect(await screen.findByText('Tu voto quedó registrado')).toBeInTheDocument();
    expect(screen.getByText('abc-123')).toBeInTheDocument();

    const envio = llamadas.find((l) => l.metodo === 'POST');
    expect(envio.cuerpo).toMatchObject({ canal: 'presencial', documento: '1098765432', candidato: 'Ana Pérez', mesa: 'Mesa 1' });
  });

  test('se puede votar en blanco', async () => {
    simularApi(rutasBase());
    const usuario = userEvent.setup();
    render(<App />);
    await cambiarRol(usuario, 'Jurado de mesa');
    await screen.findByText('Ana Pérez');
    await usuario.type(screen.getByLabelText('Documento de identidad'), '1098765432');
    await usuario.click(screen.getByRole('radio', { name: /Voto en blanco/ }));
    expect(screen.getByRole('button', { name: 'Revisar voto' })).toBeEnabled();
  });

  test('un voto rechazado muestra el motivo y vuelve al formulario', async () => {
    simularApi({ ...rutasBase(), 'POST /api/votos': { status: 422, json: { exito: false, mensaje: 'El votante ya emitio su voto' } } });
    const usuario = userEvent.setup();
    render(<App />);
    await cambiarRol(usuario, 'Jurado de mesa');
    await screen.findByText('Ana Pérez');
    await usuario.type(screen.getByLabelText('Documento de identidad'), '1098765432');
    await usuario.click(screen.getByRole('radio', { name: /Luis Gómez/ }));
    await usuario.click(screen.getByRole('button', { name: 'Revisar voto' }));
    await usuario.click(screen.getByRole('button', { name: 'Depositar voto' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El votante ya emitio su voto');
    expect(screen.getByRole('button', { name: 'Revisar voto' })).toBeInTheDocument();
  });

  test('voto virtual: pide el codigo, muestra el SMS de demostracion y envia la urna virtual', async () => {
    const llamadas = simularApi({
      ...rutasBase(),
      'POST /api/otp': { json: { exito: true, datos: { demoSms: '[SMS -> ***432] Tu codigo es 482913' } } },
      'POST /api/votos': { status: 201, json: { exito: true, datos: { idVotoAnonimo: 'v-1', comprobante: { canal: 'virtual', contenido: 'Voto remoto' } } } },
    });
    const usuario = userEvent.setup();
    render(<App />);
    await usuario.click(screen.getByRole('radio', { name: 'Virtual' }));
    await screen.findByText('Ana Pérez');

    const documento = screen.getByLabelText('Documento de identidad');
    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeDisabled();
    await usuario.type(documento, '1012345678');
    await usuario.click(screen.getByRole('button', { name: 'Enviar código' }));
    expect(await screen.findByText(/Tu codigo es 482913/)).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Código de verificación'), '482913');
    await usuario.click(screen.getByRole('radio', { name: /Luis Gómez/ }));
    await usuario.click(screen.getByRole('button', { name: 'Revisar voto' }));
    await usuario.click(screen.getByRole('button', { name: 'Depositar voto' }));

    expect(await screen.findByText('Tu voto quedó registrado')).toBeInTheDocument();
    const envio = llamadas.find((l) => l.ruta === '/api/votos');
    expect(envio.cuerpo).toMatchObject({ canal: 'virtual', otp: '482913', candidato: 'Luis Gómez' });
    expect(envio.cuerpo.mesa).toBeUndefined(); // la urna virtual la fija el servidor
    expect(envio.cuerpo.dispositivoId).toEqual(expect.any(String));
  });

  test('el documento solo admite digitos', async () => {
    simularApi(rutasBase());
    const usuario = userEvent.setup();
    render(<App />);
    const campo = screen.getByLabelText('Documento de identidad');
    await usuario.type(campo, '12ab34-56');
    expect(campo).toHaveValue('123456');
  });
});

describe('Resultados', () => {
  test('un rol sin permiso ve el motivo y como resolverlo', async () => {
    simularApi({ ...rutasBase(), 'GET /api/resultados': { status: 403, json: { exito: false, codigo: 'ROL_NO_AUTORIZADO', mensaje: 'El rol VOTANTE no puede consultar resultados' } } });
    const usuario = userEvent.setup();
    render(<App />);
    await usuario.click(screen.getByRole('button', { name: 'Resultados' }));
    await usuario.click(screen.getByRole('button', { name: 'Consultar resultados' }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('no puede consultar resultados');
    expect(alerta).toHaveTextContent('Cambia a Auditor o Administrador electoral');
  });

  test('con la eleccion abierta se indica que hay que esperar al cierre de las mesas', async () => {
    simularApi({ ...rutasBase(), 'GET /api/resultados': { status: 403, json: { exito: false, codigo: 'ELECCION_ABIERTA', mensaje: 'Los resultados no estan disponibles mientras la eleccion siga abierta' } } });
    const usuario = userEvent.setup();
    render(<App />);
    await cambiarRol(usuario, 'Auditor');
    await usuario.click(screen.getByRole('button', { name: 'Resultados' }));
    await usuario.click(screen.getByRole('button', { name: 'Consultar resultados' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('todas las mesas estén cerradas');
  });

  test('muestra el conteo con rayitas, el mas votado y el voto en blanco', async () => {
    simularApi({ ...rutasBase(), 'GET /api/resultados': { json: { exito: true, datos: { totalVotos: 6, totalMesas: 3, ganador: 'Ana Pérez', votosPorCandidato: { 'Ana Pérez': 4, 'Luis Gómez': 1, VOTO_BLANCO: 1 } } } } });
    const usuario = userEvent.setup();
    render(<App />);
    await cambiarRol(usuario, 'Auditor');
    await usuario.click(screen.getByRole('button', { name: 'Resultados' }));
    await usuario.click(screen.getByRole('button', { name: 'Consultar resultados' }));

    expect(await screen.findByText('Más votado')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '4 votos' })).toBeInTheDocument();
    expect(screen.getByText('Voto en blanco')).toBeInTheDocument();
    expect(screen.getByText('66,7 %')).toBeInTheDocument();
  });

  test('al cambiar de credencial se descartan los resultados anteriores', async () => {
    simularApi({ ...rutasBase(), 'GET /api/resultados': { json: { exito: true, datos: { totalVotos: 2, totalMesas: 3, ganador: 'Ana Pérez', votosPorCandidato: { 'Ana Pérez': 2 } } } } });
    const usuario = userEvent.setup();
    render(<App />);
    await cambiarRol(usuario, 'Auditor');
    await usuario.click(screen.getByRole('button', { name: 'Resultados' }));
    await usuario.click(screen.getByRole('button', { name: 'Consultar resultados' }));
    await screen.findByText('Más votado');
    await cambiarRol(usuario, 'Votante');
    expect(screen.queryByText('Más votado')).not.toBeInTheDocument();
  });

  test('genera el reporte con las opciones elegidas', async () => {
    const llamadas = simularApi({
      ...rutasBase(),
      'GET /api/resultados': { json: { exito: true, datos: { totalVotos: 1, totalMesas: 3, ganador: 'Ana Pérez', votosPorCandidato: { 'Ana Pérez': 1 } } } },
      'POST /api/reporte': { json: { exito: true, datos: { texto: 'RESULTADOS: prueba\nTotal de votos: 1', descripcion: 'Resultados de "prueba" + Firma de Delegado' } } },
    });
    const usuario = userEvent.setup();
    render(<App />);
    await cambiarRol(usuario, 'Auditor');
    await usuario.click(screen.getByRole('button', { name: 'Resultados' }));
    await usuario.click(screen.getByRole('button', { name: 'Consultar resultados' }));
    await screen.findByText('Reporte oficial');

    await usuario.type(screen.getByLabelText(/Firmante/), 'Delegado');
    await usuario.type(screen.getByLabelText('Observaciones (una por línea)'), 'Sin novedades{enter}Mesa 2 recontada');
    await usuario.click(screen.getByRole('button', { name: 'Generar reporte' }));

    expect(await screen.findByLabelText('Texto del reporte')).toHaveTextContent('Total de votos: 1');
    const envio = llamadas.find((l) => l.ruta === '/api/reporte');
    expect(envio.cuerpo).toMatchObject({ encabezado: true, firmante: 'Delegado', observaciones: ['Sin novedades', 'Mesa 2 recontada'] });
  });

  test('solo el administrador ve la opcion de avisar resultados', async () => {
    simularApi({ ...rutasBase(), 'GET /api/resultados': { json: { exito: true, datos: { totalVotos: 1, totalMesas: 3, ganador: 'Ana Pérez', votosPorCandidato: { 'Ana Pérez': 1 } } } } });
    const usuario = userEvent.setup();
    render(<App />);
    await cambiarRol(usuario, 'Auditor');
    await usuario.click(screen.getByRole('button', { name: 'Resultados' }));
    await usuario.click(screen.getByRole('button', { name: 'Consultar resultados' }));
    await screen.findByText('Reporte oficial');
    expect(screen.queryByText('Avisar resultados')).not.toBeInTheDocument();
  });
});

describe('Panel electoral', () => {
  const rutasPanel = () => ({
    ...rutasBase(),
    'GET /api/jerarquia': { json: ARBOL },
    'GET /api/estado': { json: { ...ESTADO, totalMesas: 2, mesasCerradas: 1 } },
  });

  test('dibuja la jerarquia y el avance de cierre', async () => {
    simularApi(rutasPanel());
    const usuario = userEvent.setup();
    render(<App />);
    await usuario.click(screen.getByRole('button', { name: 'Panel electoral' }));
    expect(await screen.findByText('Puesto Centro')).toBeInTheDocument();
    expect(screen.getByText(/1 de 2 mesas cerradas/)).toBeInTheDocument();
    expect(screen.getByText('Cerrada')).toBeInTheDocument();
    expect(screen.getByText('Abierta')).toBeInTheDocument();
  });

  test('un votante no ve botones para cerrar mesas', async () => {
    simularApi(rutasPanel());
    const usuario = userEvent.setup();
    render(<App />);
    await usuario.click(screen.getByRole('button', { name: 'Panel electoral' }));
    await screen.findByText('Puesto Centro');
    expect(screen.queryByRole('button', { name: /Cerrar Mesa/ })).not.toBeInTheDocument();
  });

  test('el jurado cierra una mesa abierta y el panel se recarga', async () => {
    const llamadas = simularApi({ ...rutasPanel(), 'POST /api/mesas/Mesa%201/cerrar': { json: { exito: true, mensaje: 'Mesa "Mesa 1" cerrada' } } });
    const usuario = userEvent.setup();
    render(<App />);
    await cambiarRol(usuario, 'Jurado de mesa');
    await usuario.click(screen.getByRole('button', { name: 'Panel electoral' }));
    await usuario.click(await screen.findByRole('button', { name: 'Cerrar Mesa 1' }));
    await waitFor(() => expect(llamadas.some((l) => l.metodo === 'POST' && l.ruta === '/api/mesas/Mesa%201/cerrar')).toBe(true));
    expect(screen.queryByRole('button', { name: 'Cerrar Mesa 2' })).not.toBeInTheDocument(); // ya estaba cerrada
  });

  test('reiniciar pide confirmacion y es solo del administrador', async () => {
    const llamadas = simularApi({ ...rutasPanel(), 'POST /api/reiniciar': { json: { exito: true } } });
    const usuario = userEvent.setup();
    render(<App />);
    await usuario.click(screen.getByRole('button', { name: 'Panel electoral' }));
    await screen.findByText('Puesto Centro');
    expect(screen.queryByRole('button', { name: 'Reiniciar elección' })).not.toBeInTheDocument();

    await cambiarRol(usuario, 'Administrador electoral');
    await usuario.click(await screen.findByRole('button', { name: 'Reiniciar elección' }));
    expect(llamadas.some((l) => l.ruta === '/api/reiniciar')).toBe(false); // todavia no
    await usuario.click(screen.getByRole('button', { name: 'Sí, reiniciar' }));
    await waitFor(() => expect(llamadas.some((l) => l.ruta === '/api/reiniciar')).toBe(true));
  });
});

describe('Auditoría', () => {
  const entrada = (extra = {}) => ({ timestamp: '2026-10-24T10:00:00.000Z', nivel: 'INFO', mensaje: 'Evento', contexto: { documento: '***432' }, hash: 'a'.repeat(64), hashAnterior: '0'.repeat(64), ...extra });

  test('muestra que la cadena es integra y lista los eventos', async () => {
    simularApi({ ...rutasBase(), 'GET /api/auditoria': { json: { exito: true, datos: { integra: true, total: 12, entradas: [entrada({ mensaje: 'Verificacion de identidad de votante' })] } } } });
    const usuario = userEvent.setup();
    render(<App />);
    await cambiarRol(usuario, 'Auditor');
    await usuario.click(screen.getByRole('button', { name: 'Auditoría' }));
    expect(await screen.findByText('Cadena íntegra')).toBeInTheDocument();
    expect(screen.getByText('Verificacion de identidad de votante')).toBeInTheDocument();
    expect(screen.getByText('documento: ***432')).toBeInTheDocument();
  });

  test('si la cadena fue alterada lo senala sin ambiguedad', async () => {
    simularApi({ ...rutasBase(), 'GET /api/auditoria': { json: { exito: true, datos: { integra: false, total: 3, entradas: [entrada()] } } } });
    const usuario = userEvent.setup();
    render(<App />);
    await cambiarRol(usuario, 'Auditor');
    await usuario.click(screen.getByRole('button', { name: 'Auditoría' }));
    expect(await screen.findByText('Cadena alterada')).toBeInTheDocument();
  });

  test('sin permiso se explica que credencial usar', async () => {
    simularApi({ ...rutasBase(), 'GET /api/auditoria': { status: 403, json: { exito: false, mensaje: 'El rol VOTANTE no puede consultar la auditoria' } } });
    const usuario = userEvent.setup();
    render(<App />);
    await usuario.click(screen.getByRole('button', { name: 'Auditoría' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cambia la credencial a Auditor');
  });
});

describe('Rayitas y cliente de la API', () => {
  test('cuatro rayas y una cruzada por cada cinco votos', () => {
    const { container } = render(<Rayitas votos={7} />);
    expect(container.querySelectorAll('svg.grupo')).toHaveLength(2);
    expect(container.querySelectorAll('line')).toHaveLength(7); // 4 + cruzada, y 2 del grupo incompleto
    expect(screen.getByRole('img', { name: '7 votos' })).toBeInTheDocument();
  });

  test('cero votos no dibuja nada y cinco votos dibujan exactamente una cruzada', () => {
    const { container, rerender } = render(<Rayitas votos={0} />);
    expect(container.querySelectorAll('line')).toHaveLength(0);
    rerender(<Rayitas votos={5} />);
    expect(container.querySelectorAll('line')).toHaveLength(5);
  });

  test('un fallo de red se traduce en un mensaje claro, sin lanzar excepciones', async () => {
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    const r = await crearApi({ rol: 'VOTANTE', usuario: 'x' }).get('/api/estado');
    expect(r.ok).toBe(false);
    expect(r.status).toBe(0);
    expect(r.datos.mensaje).toMatch(/No se pudo conectar/);
  });

  test('descarta del nombre de usuario los caracteres que romperian la cabecera HTTP', async () => {
    const llamadas = simularApi({ 'GET /api/estado': { json: {} } });
    await crearApi({ rol: 'VOTANTE', usuario: 'Ana 😀 Pérez' }).get('/api/estado');
    expect(llamadas[0].cabeceras['x-usuario']).toBe('Ana  Pérez');
  });
});
