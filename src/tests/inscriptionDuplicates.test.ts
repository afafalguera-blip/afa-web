import { describe, expect, it } from 'vitest';

import { findDuplicates, studentsSignature } from '../logic/inscriptionDuplicates';
import type { Inscription, InscriptionStudent } from '../types/inscription';

const student = (over: Partial<InscriptionStudent> = {}): InscriptionStudent => ({
  name: 'Joan',
  surname: 'Puig',
  course: '1PRI',
  activities: ['Anglès'],
  ...over,
});

const family = (over: Partial<Inscription> = {}): Inscription => ({
  id: 'i1',
  created_at: '2026-05-01T10:00:00Z',
  parent_name: 'Maria Puig',
  parent_dni: '12345678Z',
  parent_phone_1: '600000000',
  parent_email_1: 'maria@example.com',
  status: 'alta',
  students: [student()],
  afa_member: true,
  ...over,
});

describe('studentsSignature', () => {
  it('el orden de hermanos y actividades no cambia la huella', () => {
    const a = studentsSignature([
      student({ name: 'Joan', activities: ['Anglès', 'Futbol'] }),
      student({ name: 'Anna', activities: ['Patinatge'] }),
    ]);
    const b = studentsSignature([
      student({ name: 'Anna', activities: ['Patinatge'] }),
      student({ name: 'Joan', activities: ['Futbol', 'Anglès'] }),
    ]);

    expect(a).toBe(b);
  });

  it('mayúsculas y espacios de más no cambian la huella', () => {
    expect(studentsSignature([student({ name: '  JOAN ', surname: 'Puig' })])).toBe(
      studentsSignature([student({ name: 'joan', surname: 'puig' })])
    );
  });

  it('caso real: un espacio al final del nombre no crea una inscripción distinta', () => {
    // Familia Peña Basciani, curso 2026-27. Envió el mismo formulario tres
    // veces (17 jul, 28 ago 15:46, 28 ago 15:50) para la misma criatura. Las
    // dos del 28 de agosto solo se diferenciaban en estos espacios finales, y
    // por eso el freno de la base —que comparaba el JSONB crudo— no habría
    // parado la tercera. Ver 20260901190000_inscripcio_signatura.sql.
    const conEspacios = studentsSignature([
      {
        name: 'Gianluca Matteo ',
        surname: 'Pironi Peña ',
        course: 'I5',
        activities: ['Multi-esport (Ed. infantil)'],
      },
    ]);
    const sinEspacios = studentsSignature([
      {
        name: 'Gianluca Matteo',
        surname: 'Pironi Peña',
        course: 'I5',
        activities: ['Multi-esport (Ed. infantil)'],
      },
    ]);

    expect(conEspacios).toBe(sinEspacios);
  });

  it('una actividad de más sí cambia la huella', () => {
    expect(studentsSignature([student({ activities: ['Anglès'] })])).not.toBe(
      studentsSignature([student({ activities: ['Anglès', 'Futbol'] })])
    );
  });

  it('un hermano de más sí cambia la huella', () => {
    expect(studentsSignature([student()])).not.toBe(
      studentsSignature([student(), student({ name: 'Anna' })])
    );
  });
});

describe('findDuplicates', () => {
  it('una familia sola no está repetida', () => {
    expect(findDuplicates([family()])).toEqual({});
  });

  it('el mismo formulario dos veces es un duplicado exacto', () => {
    const result = findDuplicates([
      family({ id: 'vieja', created_at: '2026-05-01T10:00:00Z' }),
      family({ id: 'nueva', created_at: '2026-05-01T10:02:00Z' }),
    ]);

    expect(result.vieja.kind).toBe('exact');
    expect(result.vieja.exactOthers).toEqual(['nueva']);
    expect(result.nueva.kind).toBe('exact');
    expect(result.nueva.exactOthers).toEqual(['vieja']);
  });

  it('la misma familia con OTRA criatura no es un duplicado exacto', () => {
    // El caso que provocó el borrado: dos filas idénticas en nombre, DNI,
    // correo y teléfono, con criaturas distintas. Borrar una pierde una
    // inscripción de verdad.
    const result = findDuplicates([
      family({ id: 'joan', students: [student({ name: 'Joan' })] }),
      family({ id: 'anna', students: [student({ name: 'Anna' })] }),
    ]);

    expect(result.joan.kind).toBe('family');
    expect(result.joan.exactOthers).toEqual([]);
    expect(result.joan.others).toEqual(['anna']);
  });

  it('la ampliación con una actividad más tampoco es un duplicado exacto', () => {
    const result = findDuplicates([
      family({ id: 'primera', students: [student({ activities: ['Anglès'] })] }),
      family({ id: 'ampliada', students: [student({ activities: ['Anglès', 'Futbol'] })] }),
    ]);

    expect(result.primera.kind).toBe('family');
    expect(result.ampliada.kind).toBe('family');
  });

  it('agrupa por DNI aunque el correo sea otro', () => {
    const result = findDuplicates([
      family({ id: 'a', parent_email_1: 'maria@example.com' }),
      family({ id: 'b', parent_email_1: 'maria.puig@feina.cat' }),
    ]);

    expect(result.a.kind).toBe('exact');
    expect(result.b.others).toEqual(['a']);
  });

  it('agrupa por correo aunque el DNI esté tecleado distinto', () => {
    const result = findDuplicates([
      family({ id: 'a', parent_dni: '12345678-Z' }),
      family({ id: 'b', parent_dni: '9999999 X' }),
    ]);

    expect(result.a.kind).toBe('exact');
  });

  it('el DNI con guion o espacios es el mismo DNI', () => {
    const result = findDuplicates([
      family({ id: 'a', parent_dni: '12345678-Z', parent_email_1: 'una@example.com' }),
      family({ id: 'b', parent_dni: ' 12345678 z ', parent_email_1: 'otra@example.com' }),
    ]);

    expect(result.a.others).toEqual(['b']);
  });

  it('encadena por correo con una y por DNI con otra: los tres son el mismo grupo', () => {
    const result = findDuplicates([
      family({ id: 'a', parent_dni: 'AAA', parent_email_1: 'compartit@example.com' }),
      family({ id: 'b', parent_dni: 'BBB', parent_email_1: 'compartit@example.com' }),
      family({ id: 'c', parent_dni: 'BBB', parent_email_1: 'altre@example.com' }),
    ]);

    expect(result.a.others.sort()).toEqual(['b', 'c']);
    expect(result.c.others.sort()).toEqual(['a', 'b']);
  });

  it('familias distintas no se mezclan', () => {
    const result = findDuplicates([
      family({ id: 'a', parent_dni: 'AAA', parent_email_1: 'a@example.com' }),
      family({ id: 'b', parent_dni: 'BBB', parent_email_1: 'b@example.com' }),
    ]);

    expect(result).toEqual({});
  });

  it('sin correo ni DNI no agrupa: no hay nada por lo que decir que son la misma', () => {
    const result = findDuplicates([
      family({ id: 'a', parent_dni: '', parent_email_1: '' }),
      family({ id: 'b', parent_dni: '   ', parent_email_1: '' }),
    ]);

    expect(result).toEqual({});
  });

  it('en un grupo de tres, marca exacto solo respecto a la que de verdad coincide', () => {
    const result = findDuplicates([
      family({ id: 'joan1', students: [student({ name: 'Joan' })] }),
      family({ id: 'joan2', students: [student({ name: 'Joan' })] }),
      family({ id: 'anna', students: [student({ name: 'Anna' })] }),
    ]);

    expect(result.joan1.kind).toBe('exact');
    expect(result.joan1.exactOthers).toEqual(['joan2']);
    expect(result.joan1.others.sort()).toEqual(['anna', 'joan2']);
    expect(result.anna.kind).toBe('family');
    expect(result.anna.exactOthers).toEqual([]);
  });

  it('las otras van de la más antigua a la más nueva', () => {
    const result = findDuplicates([
      family({ id: 'nueva', created_at: '2026-06-01T00:00:00Z', students: [student({ name: 'C' })] }),
      family({ id: 'vieja', created_at: '2026-01-01T00:00:00Z', students: [student({ name: 'A' })] }),
      family({ id: 'media', created_at: '2026-03-01T00:00:00Z', students: [student({ name: 'B' })] }),
    ]);

    expect(result.nueva.others).toEqual(['vieja', 'media']);
  });
});
