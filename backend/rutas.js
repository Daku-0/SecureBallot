const { HttpError } = require('./http-utils');
const { exigirRol } = require('./identidad');
const { tarjetonDe, serializarArbol, URNA_VIRTUAL } = require('./eleccion');
const { VOTO_BLANCO } = require('../Semana08_Composite');
const { ErrorAccesoResultados, ServicioResultadosReal } = require('../Semana10_Proxy');
const {
  ReporteResultadosBase, EncabezadoInstitucional, PieConFirma, MarcaAgua, NotasAlMargen,
} = require('../Semana08_Decorator');
const { CanalEmail, CanalSMS, CanalPush } = require('../Semana07_Bridge');
const { NotificacionCodigoVerificacion } = require('./notificacion-codigo');
const { LoggerCentralizado } = require('../Semana03/singleton-votacion');

const CANALES_ENVIO = { email: () => new CanalEmail(), sms: () => new CanalSMS(), push: () => new CanalPush() };
const RE_DOCUMENTO = /^\d{6,12}$/;

const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function enMascara(documento) { return `***${String(documento).slice(-3)}`; }

function resultadoAHttp(resultado, statusExito = 200, statusError = 422) {
  return { status: resultado.exito ? statusExito : statusError, cuerpo: { exito: resultado.exito, mensaje: resultado.mensaje, datos: resultado.datos } };
}

function enmascararContexto(contexto) {
  if (!contexto || typeof contexto !== 'object') return contexto;
  const copia = { ...contexto };
  if ('documento' in copia) copia.documento = enMascara(copia.documento);
  return copia;
}

function candidatosValidos(estado) {
  const tarjeton = tarjetonDe(estado, URNA_VIRTUAL);
  return new Set([...tarjeton.opciones.map((o) => o.candidato.nombre), VOTO_BLANCO]);
}

const rutas = [
  { metodo: 'GET', patron: /^\/api\/estado$/, manejador: ({ estado }) => {
    const mesas = estado.mesas.map((nombre) => ({ nombre, cerrada: estado.raiz.buscarMesa(nombre).estaCerrada(), virtual: nombre === URNA_VIRTUAL }));
    return { status: 200, cuerpo: {
      eleccion: estado.nombre, mesas, totalMesas: mesas.length,
      mesasCerradas: mesas.filter((m) => m.cerrada).length, eleccionCerrada: estado.raiz.todasCerradas(),
    } };
  } },

  { metodo: 'GET', patron: /^\/api\/jerarquia$/, manejador: ({ estado }) => ({ status: 200, cuerpo: serializarArbol(estado.estructura, estado.raiz) }) },

  { metodo: 'GET', patron: /^\/api\/tarjeton$/, manejador: ({ estado, url }) => {
    const mesa = texto(url.searchParams.get('mesa'), 40);
    if (!estado.raiz.buscarMesa(mesa)) throw new HttpError(404, `La mesa "${mesa}" no existe`, 'MESA_INEXISTENTE');
    const tarjeton = tarjetonDe(estado, mesa);
    const opciones = tarjeton.opciones.map((o) => ({
      posicion: o.posicion, codigo: o.candidato.codigo, nombre: o.candidato.nombre,
      partido: o.candidato.partido, propuesta: o.candidato.propuesta,
    }));
    return { status: 200, cuerpo: { mesa, opciones, votoBlanco: VOTO_BLANCO, instanciasCompartidas: estado.fabricaCandidatos.getTotalInstancias() } };
  } },

  { metodo: 'POST', patron: /^\/api\/otp$/, manejador: ({ estado, cuerpo }) => {
    const documento = texto(cuerpo.documento, 12);
    if (!RE_DOCUMENTO.test(documento)) throw new HttpError(400, 'El documento debe tener entre 6 y 12 digitos', 'DOCUMENTO_INVALIDO');
    const codigo = estado.almacenOtp.emitir(documento);
    // El codigo viaja por el Bridge como SMS. En esta demo no hay operador, asi que el "SMS" se devuelve en la respuesta.
    const sms = new NotificacionCodigoVerificacion(new CanalSMS()).enviar(enMascara(documento), { codigo, minutos: 5 });
    return { status: 200, cuerpo: { exito: true, mensaje: 'Codigo enviado', datos: { demoSms: sms } } };
  } },

  { metodo: 'POST', patron: /^\/api\/votos$/, manejador: ({ estado, cuerpo, identidad }) => {
    const canal = cuerpo.canal;
    if (canal !== 'presencial' && canal !== 'virtual') throw new HttpError(400, 'El canal debe ser presencial o virtual', 'CANAL_INVALIDO');
    const documento = texto(cuerpo.documento, 12);
    if (!RE_DOCUMENTO.test(documento)) throw new HttpError(400, 'El documento debe tener entre 6 y 12 digitos', 'DOCUMENTO_INVALIDO');
    const candidato = texto(cuerpo.candidato, 60);
    if (!candidatosValidos(estado).has(candidato)) throw new HttpError(400, 'El candidato no esta en el tarjeton', 'CANDIDATO_INVALIDO');

    let solicitud;
    let otpCoincide = true;
    if (canal === 'presencial') {
      exigirRol(identidad, ['JURADO'], 'habilitar un voto presencial: lo autoriza el jurado de la mesa');
      const mesa = texto(cuerpo.mesa, 40);
      if (mesa === URNA_VIRTUAL) throw new HttpError(400, 'La urna virtual no recibe votos presenciales', 'MESA_INVALIDA');
      solicitud = { documento, candidato, mesa, datosVotante: { identificacion: documento, verificadoPorEncargado: true } };
    } else {
      const dispositivoId = texto(cuerpo.dispositivoId, 64);
      if (!/^[\w-]{8,64}$/.test(dispositivoId)) throw new HttpError(400, 'Falta el identificador del dispositivo', 'DISPOSITIVO_INVALIDO');
      const otpIngresado = texto(cuerpo.otp, 6);
      const otpEsperado = estado.almacenOtp.esperado(documento) || undefined;
      otpCoincide = Boolean(otpEsperado) && otpIngresado === otpEsperado;
      solicitud = { documento, candidato, mesa: URNA_VIRTUAL, dispositivoId, datosVotante: { otpIngresado, otpEsperado } };
    }

    const resultado = estado.fachadas[canal].emitirVoto(solicitud);
    if (canal === 'virtual') {
      if (resultado.exito) estado.almacenOtp.consumir(documento);
      else if (!otpCoincide) estado.almacenOtp.registrarFallo(documento);
    }
    return resultadoAHttp(resultado, 201, 422);
  } },

  { metodo: 'POST', patron: /^\/api\/mesas\/([^/]+)\/cerrar$/, manejador: ({ estado, params, identidad }) => {
    exigirRol(identidad, ['JURADO', 'ADMIN_ELECTORAL'], 'cerrar una mesa');
    const resultado = estado.fachadas.presencial.cerrarMesa(decodeURIComponent(params[0]));
    return resultadoAHttp(resultado, 200, 404);
  } },

  { metodo: 'GET', patron: /^\/api\/resultados$/, manejador: ({ estado, identidad }) => {
    const datos = estado.servicioResultadosPara(identidad).consultar(); // el Proxy decide
    return { status: 200, cuerpo: { exito: true, datos } };
  } },

  { metodo: 'POST', patron: /^\/api\/reporte$/, manejador: ({ estado, cuerpo, identidad }) => {
    const resultados = estado.servicioResultadosPara(identidad).consultar(); // tambien pasa por el Proxy
    let reporte = new ReporteResultadosBase(estado.nombre, resultados.votosPorCandidato);
    if (cuerpo.encabezado === true) reporte = new EncabezadoInstitucional(reporte);
    const firmante = texto(cuerpo.firmante, 80);
    if (firmante) reporte = new PieConFirma(reporte, firmante);
    const marca = texto(cuerpo.marcaAgua, 30);
    if (marca) reporte = new MarcaAgua(reporte, marca);
    const observaciones = Array.isArray(cuerpo.observaciones)
      ? cuerpo.observaciones.slice(0, 10).map((o) => texto(o, 200)).filter(Boolean) : [];
    if (observaciones.length) {
      const notas = new NotasAlMargen(reporte);
      observaciones.forEach((o) => notas.agregarObservacion(o));
      reporte = notas;
    }
    return { status: 200, cuerpo: { exito: true, datos: { texto: reporte.generar(), descripcion: reporte.getDescripcion() } } };
  } },

  { metodo: 'POST', patron: /^\/api\/publicar$/, manejador: ({ estado, cuerpo, identidad }) => {
    exigirRol(identidad, ['ADMIN_ELECTORAL'], 'publicar resultados');
    const fabricaCanal = CANALES_ENVIO[cuerpo.canal];
    if (!fabricaCanal) throw new HttpError(400, 'El canal debe ser email, sms o push', 'CANAL_ENVIO_INVALIDO');
    const destinatario = texto(cuerpo.destinatario, 80);
    if (!destinatario) throw new HttpError(400, 'Falta el destinatario', 'DESTINATARIO_INVALIDO');
    const resultado = estado.fachadas.presencial.publicarResultados({ nombreEleccion: estado.nombre, destinatario, canalEnvio: fabricaCanal() });
    return resultadoAHttp(resultado, 200, 409);
  } },

  { metodo: 'GET', patron: /^\/api\/auditoria$/, manejador: ({ url, identidad }) => {
    exigirRol(identidad, ['AUDITOR', 'ADMIN_ELECTORAL'], 'consultar la auditoria');
    const logger = LoggerCentralizado.obtenerInstancia();
    const limite = Math.min(Math.max(parseInt(url.searchParams.get('limite'), 10) || 50, 1), 200);
    const integra = logger.verificarIntegridad();
    const historial = logger.obtenerHistorial();
    const entradas = historial.slice(-limite).reverse().map((e) => ({
      timestamp: e.timestamp, nivel: e.nivel, mensaje: e.mensaje, contexto: enmascararContexto(e.contexto),
      hash: e.hash, hashAnterior: e.hashAnterior,
    }));
    logger.registrar('INFO', 'Consulta de auditoria', { usuario: identidad.usuario, rol: identidad.rol });
    return { status: 200, cuerpo: { exito: true, datos: { integra, total: historial.length, entradas } } };
  } },

  { metodo: 'POST', patron: /^\/api\/reiniciar$/, manejador: ({ ctx, identidad }) => {
    exigirRol(identidad, ['ADMIN_ELECTORAL'], 'reiniciar la eleccion de demostracion');
    ctx.reiniciar();
    LoggerCentralizado.obtenerInstancia().registrar('WARN', 'Eleccion de demostracion reiniciada', { usuario: identidad.usuario });
    return { status: 200, cuerpo: { exito: true, mensaje: 'Eleccion reiniciada' } };
  } },
];

module.exports = { rutas, ErrorAccesoResultados, ServicioResultadosReal };
