/**
 * ABSTRACT FACTORY — Familia concreta: canal VIRTUAL / REMOTO.
 *
 * El votante realiza todo el proceso desde su propio dispositivo, sin
 * encargado presente. La autenticación y el comprobante son
 * completamente digitales, igual que en el canal presencial.
 */
const { FabricaCanalVotacion } = require('./fabrica-canal-votacion');
const { Autenticador, ValidadorDeVoto, EmisorDeComprobante } = require('./componentes-votacion');

class AutenticadorVirtual extends Autenticador {
  autenticar(datosVotante) {
    // Sin encargado presente: la identidad se confirma con un mecanismo
    // digital (OTP/token) enviado al votante.
    const autenticado = Boolean(
      datosVotante?.otpIngresado && datosVotante?.otpIngresado === datosVotante?.otpEsperado
    );
    return { autenticado, canal: 'virtual', metodo: 'otp' };
  }
}

class ValidadorDeVotoVirtual extends ValidadorDeVoto {
  validar(datosVoto) {
    // No hay mesa física: el voto se ata al dispositivo/sesión desde la
    // que se emitió, para poder rastrear el origen sin mesa asignada.
    const valido = Boolean(datosVoto?.candidato && datosVoto?.dispositivoId);
    return {
      valido,
      canal: 'virtual',
      motivo: valido ? undefined : 'falta candidato o identificador de dispositivo',
    };
  }
}

class EmisorDeComprobanteVirtual extends EmisorDeComprobante {
  emitir(datosVoto) {
    // Comprobante digital enviado al dispositivo/correo del votante.
    return {
      formato: 'digital',
      canal: 'virtual',
      contenido: `Comprobante electrónico — Voto remoto (dispositivo ${datosVoto.dispositivoId}), candidato: ${datosVoto.candidato}`,
    };
  }
}

class FabricaVotacionVirtual extends FabricaCanalVotacion {
  crearAutenticador() {
    return new AutenticadorVirtual();
  }

  crearValidadorDeVoto() {
    return new ValidadorDeVotoVirtual();
  }

  crearEmisorDeComprobante() {
    return new EmisorDeComprobanteVirtual();
  }
}

module.exports = {
  AutenticadorVirtual,
  ValidadorDeVotoVirtual,
  EmisorDeComprobanteVirtual,
  FabricaVotacionVirtual,
};
