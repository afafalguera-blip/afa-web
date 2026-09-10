import { describe, expect, it } from 'vitest';
import {
  normalizeName,
  parseAmount,
  parseStatementCsv,
  parseStatementDate,
  parseStatementRows,
  payerFromConcept,
} from '../utils/bankStatement';
import { BankReconciliationService, prefixCandidates, type PendingPayment } from '../services/admin/BankReconciliationService';

/**
 * El listado «Consulta de movimientos» es lo que el tesorero baja de BS Online:
 * un CSV con ocho líneas de cabecera, importes en formato español y —lo que más
 * duele— el concepto cortado a lo ancho de la columna, que parte los nombres
 * largos por la mitad. Si el parser se equivoca, se marcan como pagados recibos
 * de otra familia.
 */

// Extracto real recortado: preámbulo, cabecera y una muestra de movimientos.
const CSV = [
  'Consulta de movimientos,,,,,,',
  '09/09/2026 12:39:17,,,,,,',
  ',,,,,,',
  'Cuenta: ,0081-1604-74-0001038208,,,,,',
  'Divisa: ,EUR,,,,,',
  'Titular:,ASSOC DE PARES COL LEGI PUBLIC FALGUERA,,,,,',
  'Selección:,Desde 01/06/2026 hasta 09/09/2026.,,,,,',
  ',,,,,,',
  'F. Operativa,Concepto,F. Valor,Importe,Saldo,Referencia 1,Referencia 2',
  '09/09/2026,ABONO TRANSFERENCIA DE MARIA ASCENSION CASTILLO ROSALES,09/09/2026,"20,00","11.395,35",,MARIA ASCENSION',
  '08/09/2026,TRANSFERENCIA DE SILVIA PALLARES SANTOS,08/09/2026,"62,00","11.349,35",,',
  '07/09/2026,ABONO TRANSFERENCIA DE MARIA DE LOS ANGELES ALASTRE HERNAND,07/09/2026,"54,00","11.253,35",,MARIA DE LOS ANG',
  '04/09/2026,ABONO TRANSFERENCIA DE ELIZABETH DE LOS ANGELES QUISHPE GOM,04/09/2026,"54,00","11.199,35",,ELIZABETH DE LOS',
  '04/09/2026,TRANSFERENCIA EVA LUQUE RODRIGUEZ,04/09/2026,"54,00","10.922,35",,',
  '04/09/2026,ADEUDO RECIBO GRENKE ALQUILER S.L.,04/09/2026,"-84,70","10.868,35",B62652805ZZZ,06354041',
  '29/06/2026,TRANSFERENCIA A El Club d\'Esplai Diversitat Ludic,28/06/2026,"-4.500,00","6.369,82",258222388,',
  '14/07/2026,INGRESO EFECTIVO CAJERO AUTOMATICO 008103410011/ANTONELLA LOZANO,15/07/2026,"120,00","8.249,29",,',
].join('\n');

describe('parseAmount', () => {
  it('lee el formato español, con y sin miles', () => {
    expect(parseAmount('20,00')).toBe(20);
    expect(parseAmount('-84,70')).toBe(-84.7);
    expect(parseAmount('-4.500,00')).toBe(-4500);
    expect(parseAmount('11.395,35')).toBe(11395.35);
  });

  it('un separador seguido de tres dígitos y solo ese separador son miles', () => {
    expect(parseAmount('1.500')).toBe(1500);
    expect(parseAmount('4.500,00')).toBe(4500);
  });

  it('devuelve null para lo que no es un importe', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('Saldo')).toBeNull();
  });
});

describe('parseStatementDate', () => {
  it('convierte dd/mm/yyyy a ISO', () => {
    expect(parseStatementDate('09/09/2026')).toBe('2026-09-09');
    expect(parseStatementDate('4/6/2026')).toBe('2026-06-04');
  });

  it('deja pasar el ISO y rechaza el resto', () => {
    expect(parseStatementDate('2026-09-09')).toBe('2026-09-09');
    expect(parseStatementDate('F. Operativa')).toBeNull();
  });
});

describe('payerFromConcept', () => {
  it('quita el literal genérico que el banco pone delante', () => {
    expect(payerFromConcept('ABONO TRANSFERENCIA DE MARIA ASCENSION CASTILLO ROSALES')).toBe('MARIA ASCENSION CASTILLO ROSALES');
    expect(payerFromConcept('TRANSFERENCIA DE SILVIA PALLARES SANTOS')).toBe('SILVIA PALLARES SANTOS');
    expect(payerFromConcept('TRANSFERENCIA EVA LUQUE RODRIGUEZ')).toBe('EVA LUQUE RODRIGUEZ');
    expect(payerFromConcept('BIZUM DE NURIA OCAÑA FERRANDO')).toBe('NURIA OCANA FERRANDO');
  });

  it('en un ingreso por cajero el nombre va detrás de la barra', () => {
    expect(payerFromConcept('INGRESO EFECTIVO CAJERO AUTOMATICO 008103410011/ANTONELLA LOZANO'))
      .toBe('ANTONELLA LOZANO');
  });
});

describe('parseStatementCsv', () => {
  const movements = parseStatementCsv(CSV);

  it('se salta el preámbulo y lee todos los movimientos', () => {
    expect(movements).toHaveLength(8);
  });

  it('no confunde el importe con el saldo', () => {
    const first = movements[0];
    expect(first.date).toBe('2026-09-09');
    expect(first.amount).toBe(20);
    expect(first.isIncome).toBe(true);
  });

  it('los cargos salen en negativo y fuera de los ingresos', () => {
    const grenke = movements.find(m => m.rawConcept.includes('GRENKE'))!;
    expect(grenke.amount).toBe(-84.7);
    expect(grenke.isIncome).toBe(false);
    expect(movements.filter(m => m.isIncome)).toHaveLength(6);
  });

  it('respeta la fecha valor cuando difiere de la operativa', () => {
    const esplai = movements.find(m => m.rawConcept.includes('Esplai'))!;
    expect(esplai.date).toBe('2026-06-29');
    expect(esplai.valueDate).toBe('2026-06-28');
    expect(esplai.amount).toBe(-4500);
  });

  it('marca como cortados los conceptos que llegan al ancho de la columna', () => {
    const cut = movements.find(m => m.payerNorm.endsWith('ALASTRE HERNAND'))!;
    expect(cut.truncated).toBe(true);
    const short = movements.find(m => m.payerNorm === 'SILVIA PALLARES SANTOS')!;
    expect(short.truncated).toBe(false);
  });

  it('también lee la variante con punto y coma', () => {
    const semi = [
      'Consulta de movimientos;;;;;;',
      'F. Operativa;Concepto;F. Valor;Importe;Saldo;Referencia 1;Referencia 2',
      '09/09/2026;ABONO TRANSFERENCIA DE ZAINAB ABBAS;09/09/2026;"28,00";"11.037,35";;',
      '04/09/2026;ADEUDO RECIBO GRENKE ALQUILER S.L.;04/09/2026;"-84,70";"10.868,35";B62652805ZZZ;06354041',
    ].join('\n');
    const movements = parseStatementCsv(semi);
    expect(movements).toHaveLength(2);
    expect(movements[0].amount).toBe(28);
    expect(movements[1].amount).toBe(-84.7);
  });

  it('devuelve vacío si el fichero no tiene cabecera de movimientos', () => {
    expect(parseStatementCsv('hola,que,tal\n1,2,3')).toHaveLength(0);
  });
});

describe('parseStatementRows', () => {
  it('acepta las filas ya tabuladas de un Excel', () => {
    const rows = [
      ['Consulta de movimientos', '', '', '', ''],
      ['F. Operativa', 'Concepto', 'F. Valor', 'Importe', 'Saldo'],
      ['09/09/2026', 'ABONO TRANSFERENCIA DE ZAINAB ABBAS', '09/09/2026', '28,00', '11.037,35'],
    ];
    const [mov] = parseStatementRows(rows);
    expect(mov.amount).toBe(28);
    expect(mov.payerNorm).toBe('ZAINAB ABBAS');
  });
});

// ---------------------------------------------------------------------------

describe('prefixCandidates', () => {
  const parents = [
    'MARIA DE LOS ANGELES ALASTRE HERNANDEZ',
    'JOSE LUIS LOPEZ MARON',
    'MARIA DE LOS ANGELES ALCAIDE HERNANDEZ',
  ];

  it('encuentra a la familia cuyo nombre empieza por el trozo que llegó', () => {
    expect(prefixCandidates('MARIA DE LOS ANGELES ALASTRE HERNAND', parents))
      .toEqual(['MARIA DE LOS ANGELES ALASTRE HERNANDEZ']);
  });

  it('tolera que el banco invierta nombre y apellidos', () => {
    expect(prefixCandidates('ALASTRE HERNANDEZ MARIA DE LOS ANGE', parents))
      .toEqual(['MARIA DE LOS ANGELES ALASTRE HERNANDEZ']);
  });

  it('devuelve las dos cuando el corte no distingue', () => {
    expect(prefixCandidates('MARIA DE LOS ANGELES ALC', parents)).toHaveLength(1);
    expect(prefixCandidates('MARIA DE LOS ANGELES AL', parents)).toHaveLength(2);
  });

  it('no adivina con un trozo demasiado corto', () => {
    expect(prefixCandidates('JOSE LUIS', parents)).toEqual([]);
  });
});

let seq = 0;
function debt(parent: string, amount: number, overrides: Partial<PendingPayment> = {}): PendingPayment {
  seq += 1;
  return {
    id: `d${seq}`,
    kind: 'payment',
    student_name: 'Nen',
    student_surname: 'Cognom',
    course: '1PRI',
    concept: 'extraescolar',
    amount,
    due_date: '2026-09-01',
    parent_name: parent,
    payment_month: 9,
    payment_year: 2026,
    ...overrides,
  };
}

describe('reconcile con nombres cortados y pedidos de tienda', () => {
  it('propone la familia pero pide confirmación cuando el nombre llegó cortado', () => {
    const [movement] = parseStatementCsv(CSV).filter(m => m.payerNorm.endsWith('ALASTRE HERNAND'));
    const receipt = debt('Maria de los Angeles Alastre Hernandez', 54);

    const [row] = BankReconciliationService.reconcile([movement], [receipt], []);

    expect(row.confidence).toBe('medium');
    expect(row.parentName).toBe('Maria de los Angeles Alastre Hernandez');
    expect(row.suggestedPaymentIds).toEqual([receipt.id]);
  });

  it('no elige por su cuenta si el trozo encaja con dos familias', () => {
    const [movement] = parseStatementCsv(CSV).filter(m => m.payerNorm.endsWith('ALASTRE HERNAND'));
    const rows = BankReconciliationService.reconcile(
      [movement],
      [debt('Maria de los Angeles Alastre Hernandez', 54), debt('Maria de los Angeles Alastre Hernando', 54)],
      [],
    );
    expect(rows[0].confidence).toBe('unmatched');
    expect(rows[0].suggestedPaymentIds).toEqual([]);
  });

  it('un alias aprendido convierte el nombre cortado en coincidencia segura', () => {
    const [movement] = parseStatementCsv(CSV).filter(m => m.payerNorm.endsWith('ALASTRE HERNAND'));
    const receipt = debt('Maria de los Angeles Alastre Hernandez', 54);

    const [row] = BankReconciliationService.reconcile(
      [movement],
      [receipt],
      [{ alias_normalized: movement.payerNorm, parent_name: receipt.parent_name! }],
    );

    expect(row.confidence).toBe('high');
    expect(row.suggestedPaymentIds).toEqual([receipt.id]);
  });

  it('concilia también un pedido de tienda pendiente', () => {
    const order = debt('Eva Luque Rodriguez', 54, { kind: 'shop_order', concept: 'botiga', student_surname: '' });
    const [movement] = parseStatementCsv(CSV).filter(m => m.payerNorm === normalizeName('Eva Luque Rodriguez'));

    const [row] = BankReconciliationService.reconcile([movement], [order], []);

    expect(row.confidence).toBe('high');
    expect(row.candidatePayments[0].kind).toBe('shop_order');
    expect(row.suggestedPaymentIds).toEqual([order.id]);
  });
});
