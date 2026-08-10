import { describe, expect, it } from 'vitest';
import { normalizeName, parseN43, tokenKey } from '../utils/n43';

/**
 * El extracto N43 de Sabadell es la única fuente para conciliar los pagos de las
 * familias: si el parser se desalinea una columna, los importes o el ordenante
 * salen mal y se marcan como pagados recibos equivocados.
 */

/** Registro tipo 22 (movimiento) de 80 columnas. */
function movementRecord(opts: {
  date: string; // YYMMDD
  valueDate?: string; // YYMMDD
  cents: number;
  debit?: boolean;
}): string {
  const amount = String(opts.cents).padStart(14, '0');
  return (
    '22' + // tipo
    '00000000' + // oficina + cuenta (cols 3-10)
    opts.date + // cols 11-16
    (opts.valueDate ?? opts.date) + // cols 17-22
    '12345' + // concepto común + propio (cols 23-27)
    (opts.debit ? '1' : '2') + // cols 28: 1 = cargo, 2 = abono
    amount // cols 29-42
  ).padEnd(80, ' ');
}

/** Registro tipo 23 (concepto complementario). */
function conceptRecord(text: string): string {
  return ('23' + '01' + text).padEnd(80, ' ');
}

describe('normalizeName', () => {
  it('pasa a mayúsculas y quita acentos', () => {
    expect(normalizeName('María Belén Núñez')).toBe('MARIA BELEN NUNEZ');
  });

  it('convierte puntuación en espacios y los colapsa', () => {
    expect(normalizeName('GARCIA-LOPEZ,  JOSE.')).toBe('GARCIA LOPEZ JOSE');
  });

  it('devuelve cadena vacía para entrada vacía', () => {
    expect(normalizeName('   ')).toBe('');
  });
});

describe('tokenKey', () => {
  it('es insensible al orden nombre/apellidos', () => {
    const a = tokenKey(normalizeName('RODRIGUEZ YANEZ MARIA BELEN'));
    const b = tokenKey(normalizeName('María Belén Rodríguez Yáñez'));
    expect(a).toBe(b);
  });
});

describe('parseN43', () => {
  it('extrae fecha, importe y ordenante de un abono', () => {
    const raw = [
      movementRecord({ date: '260315', valueDate: '260316', cents: 4550 }),
      conceptRecord('TRANSFERENCIA DE MARIA BELEN RODRIGUEZ'),
      '88' + ''.padEnd(78, ' '),
    ].join('\n');

    const [mov] = parseN43(raw);

    expect(mov.date).toBe('2026-03-15');
    expect(mov.valueDate).toBe('2026-03-16');
    expect(mov.amount).toBe(45.5);
    expect(mov.isIncome).toBe(true);
    expect(mov.payerName).toBe('MARIA BELEN RODRIGUEZ');
    expect(mov.payerTokenKey).toBe('BELEN MARIA RODRIGUEZ');
  });

  it('marca los cargos como importe negativo', () => {
    const raw = [
      movementRecord({ date: '260401', cents: 12000, debit: true }),
      conceptRecord('RECIBO LUZ'),
    ].join('\n');

    const [mov] = parseN43(raw);

    expect(mov.amount).toBe(-120);
    expect(mov.isIncome).toBe(false);
  });

  it('acumula varios registros 23 en un solo concepto', () => {
    const raw = [
      movementRecord({ date: '260401', cents: 1000 }),
      conceptRecord('BIZUM DE JOAN'),
      conceptRecord('PUIG MARTI'),
    ].join('\n');

    const [mov] = parseN43(raw);

    expect(mov.rawConcept).toBe('BIZUM DE JOAN PUIG MARTI');
    expect(mov.payerName).toBe('JOAN PUIG MARTI');
  });

  it.each([
    ['ABONO TRANSFERENCIA DE ANA SOLE', 'ANA SOLE'],
    ['ABONO TRF DE ANA SOLE', 'ANA SOLE'],
    ['TRANSFERENCIA ANA SOLE', 'ANA SOLE'],
    ['TRASPASO DE ANA SOLE', 'ANA SOLE'],
    ['BIZUM ANA SOLE', 'ANA SOLE'],
  ])('quita el prefijo genérico del banco en %s', (concept, expected) => {
    const raw = [movementRecord({ date: '260401', cents: 1000 }), conceptRecord(concept)].join('\n');
    expect(parseN43(raw)[0].payerName).toBe(expected);
  });

  it('separa movimientos consecutivos', () => {
    const raw = [
      movementRecord({ date: '260301', cents: 1000 }),
      conceptRecord('BIZUM DE UNO'),
      movementRecord({ date: '260302', cents: 2000 }),
      conceptRecord('BIZUM DE DOS'),
    ].join('\n');

    const movs = parseN43(raw);

    expect(movs).toHaveLength(2);
    expect(movs.map(m => m.payerName)).toEqual(['UNO', 'DOS']);
    expect(movs.map(m => m.amount)).toEqual([10, 20]);
  });

  it('acepta ficheros sin saltos de línea (registros de 80 columnas seguidos)', () => {
    const raw =
      movementRecord({ date: '260301', cents: 1000 }) + conceptRecord('BIZUM DE UNO');

    const movs = parseN43(raw);

    expect(movs).toHaveLength(1);
    expect(movs[0].payerName).toBe('UNO');
  });

  it('devuelve lista vacía si no hay movimientos', () => {
    expect(parseN43('')).toEqual([]);
    expect(parseN43('11' + ''.padEnd(78, ' '))).toEqual([]);
  });
});
