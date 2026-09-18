const { Autenticador, ValidadorDeVoto, EmisorDeComprobante } = require('./componentes-votacion');
const { FabricaCanalVotacion } = require('./fabrica-canal-votacion');
const {
  AutenticadorPresencial,
  ValidadorDeVotoPresencial,
  EmisorDeComprobantePresencial,
  FabricaVotacionPresencial,
} = require('./canal-presencial');
const {
  AutenticadorVirtual,
  ValidadorDeVotoVirtual,
  EmisorDeComprobanteVirtual,
  FabricaVotacionVirtual,
} = require('./canal-virtual');

module.exports = {
  Autenticador,
  ValidadorDeVoto,
  EmisorDeComprobante,
  FabricaCanalVotacion,
  AutenticadorPresencial,
  ValidadorDeVotoPresencial,
  EmisorDeComprobantePresencial,
  FabricaVotacionPresencial,
  AutenticadorVirtual,
  ValidadorDeVotoVirtual,
  EmisorDeComprobanteVirtual,
  FabricaVotacionVirtual,
};
