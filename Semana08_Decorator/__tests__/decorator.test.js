process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'admin';
process.env.DB_PASS = 'secret';
process.env.API_KEY = 'abc123';

const crypto = require('crypto');
const {
  ReporteElectoral, ReporteResultadosBase, ReporteDecorator,
  EncabezadoInstitucional, PieConFirma, MarcaAgua, NotasAlMargen,
} = require('../index');
const { MesaVotacion } = require('../../Semana08_Composite');
const { LoggerCentralizado } = require('../../Semana03/singleton-votacion');

const RESULTADOS = { Ana: 60, Luis: 30, VOTO_BLANCO: 10 };
const FECHA_FIJA = () => new Date('2026-10-23T12:00:00.000Z');
const base = () => new ReporteResultadosBase('Alcaldia', RESULTADOS);

describe('Decorator: reportes de resultados', () => {
  test('el reporte base muestra votos, porcentajes y total ordenados por votos', () => {
    const lineas = base().generar().split('\n');
    expect(lineas[0]).toBe('RESULTADOS: Alcaldia');
    expect(lineas[1]).toBe('Ana: 60 votos (60.00%)');
    expect(lineas[2]).toBe('Luis: 30 votos (30.00%)');
    expect(lineas[3]).toBe('VOTO_BLANCO: 10 votos (10.00%)');
    expect(lineas[4]).toBe('Total de votos: 100');
  });

  test('el reporte base puede construirse desde cualquier nodo del Composite', () => {
    const mesa = new MesaVotacion('Mesa 1');
    mesa.registrarVoto('Ana'); mesa.registrarVoto('Ana'); mesa.registrarVoto('Luis');
    const texto = ReporteResultadosBase.desdeElemento('Alcaldia', mesa).generar();
    expect(texto).toContain('Ana: 2 votos (66.67%)');
    expect(texto).toContain('Total de votos: 3');
  });

  test('sin votos no divide por cero', () => {
    expect(new ReporteResultadosBase('Vacia', {}).generar()).toContain('Total de votos: 0');
  });

  test('el encabezado se antepone sin tocar el contenido base', () => {
    const texto = new EncabezadoInstitucional(base()).generar();
    expect(texto.startsWith('====')).toBe(true);
    expect(texto).toContain('SecureBallot - Plataforma de Votacion Electronica');
    expect(texto.endsWith(base().generar())).toBe(true);
  });

  test('el pie agrega firmante, fecha y huella SHA-256 verificable', () => {
    const texto = new PieConFirma(base(), 'Registrador Delegado', FECHA_FIJA).generar();
    expect(texto).toContain('Firma: Registrador Delegado');
    expect(texto).toContain('Fecha: 2026-10-23T12:00:00.000Z');

    const huellaEnReporte = texto.match(/Huella SHA-256: ([0-9a-f]{64})/)[1];
    const huellaRecalculada = crypto.createHash('sha256').update(base().generar()).digest('hex');
    expect(huellaEnReporte).toBe(huellaRecalculada);
  });

  test('la marca de agua se pone en cada linea no vacia', () => {
    const texto = new MarcaAgua(base(), 'COPIA').generar();
    const lineas = texto.split('\n');
    expect(lineas.every((l) => l.startsWith('[COPIA] '))).toBe(true);
  });

  test('las notas al margen solo aparecen si hay observaciones', () => {
    const sin = new NotasAlMargen(base());
    expect(sin.generar()).toBe(base().generar());

    const con = new NotasAlMargen(base()).agregarObservacion('Mesa 7 con recuento').agregarObservacion('Sin novedades');
    expect(con.generar()).toContain('--- OBSERVACIONES ---\n+ Mesa 7 con recuento\n+ Sin novedades');
    expect(con.getDescripcion()).toContain('2 observaciones');
  });

  test('un reporte decorado sigue siendo un ReporteElectoral (misma interfaz)', () => {
    const decorado = new MarcaAgua(new PieConFirma(new EncabezadoInstitucional(base()), 'X', FECHA_FIJA), 'COPIA');
    expect(decorado).toBeInstanceOf(ReporteElectoral);
    expect(decorado).toBeInstanceOf(ReporteDecorator);
    expect(typeof decorado.generar()).toBe('string');
  });

  test('se pueden combinar los cuatro decoradores y la descripcion los refleja', () => {
    const completo = new NotasAlMargen(
      new MarcaAgua(
        new PieConFirma(new EncabezadoInstitucional(base()), 'Registrador Delegado', FECHA_FIJA),
        'COPIA'
      )
    ).agregarObservacion('Escrutinio finalizado');

    const texto = completo.generar();
    expect(texto).toContain('[COPIA] SecureBallot');
    expect(texto).toContain('[COPIA] Firma: Registrador Delegado');
    expect(texto).toContain('+ Escrutinio finalizado');
    expect(completo.getDescripcion()).toBe(
      'Encabezado institucional + Resultados de "Alcaldia" + Firma de Registrador Delegado + Marca de agua \'COPIA\' + 1 observaciones'
    );
  });

  test('el ORDEN de decoracion importa: la huella cubre solo lo que el pie envuelve', () => {
    const a = new PieConFirma(new EncabezadoInstitucional(base()), 'X', FECHA_FIJA).generar(); // huella incluye encabezado
    const b = new EncabezadoInstitucional(new PieConFirma(base(), 'X', FECHA_FIJA)).generar(); // huella solo del cuerpo
    expect(a).not.toBe(b);
    const huella = (t) => t.match(/Huella SHA-256: ([0-9a-f]{64})/)[1];
    expect(huella(a)).not.toBe(huella(b));
  });

  test('decorar no duplica la auditoria: un reporte genera exactamente un registro', () => {
    const decorado = new MarcaAgua(new PieConFirma(new EncabezadoInstitucional(base()), 'X', FECHA_FIJA), 'COPIA');
    const antes = LoggerCentralizado.obtenerInstancia().obtenerHistorial().length;
    decorado.generar();
    const despues = LoggerCentralizado.obtenerInstancia().obtenerHistorial().length;
    expect(despues).toBe(antes + 1);
  });

  test('Open/Closed: un decorador nuevo se agrega sin modificar ninguna clase existente', () => {
    class NumeroPagina extends ReporteDecorator {
      generar() { return `${super.generar()}\n\nPagina 1 de 1`; }
    }
    const texto = new NumeroPagina(new EncabezadoInstitucional(base())).generar();
    expect(texto.endsWith('Pagina 1 de 1')).toBe(true);
    expect(texto).toContain('SecureBallot');
  });

  test('valida sus entradas y el Component abstracto bloquea su uso directo', () => {
    expect(() => new EncabezadoInstitucional({ generar: () => 'x' })).toThrow('requiere un ReporteElectoral');
    expect(() => new PieConFirma(base())).toThrow('requiere un firmante');
    expect(() => new MarcaAgua(base())).toThrow('requiere un texto');
    expect(() => new ReporteElectoral().generar()).toThrow('debe implementarse');
  });

  test('el reporte no cambia si se altera el objeto de resultados original', () => {
    const origen = { Ana: 1 };
    const reporte = new ReporteResultadosBase('E', origen);
    origen.Ana = 999;
    expect(reporte.generar()).toContain('Ana: 1 votos');
  });
});
