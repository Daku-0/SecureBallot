/**
 * Debe requerirse ANTES que cualquier modulo que cargue los Singleton:
 * ConfiguracionGlobal exige estas variables. En produccion se definen en el
 * entorno real; aqui solo se completan valores de desarrollo si faltan.
 */
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'admin';
process.env.DB_PASS = process.env.DB_PASS || 'secret';
process.env.API_KEY = process.env.API_KEY || 'dev-key';
