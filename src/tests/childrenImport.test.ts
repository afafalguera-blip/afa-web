import { describe, expect, it } from 'vitest';
import { findDuplicates, parseChildrenCsv } from '../logic/childrenImport';

describe('parseChildrenCsv', () => {
  it('reads the file a Catalan Excel exports: semicolons and accented headings', () => {
    const csv = [
      'Nom;Cognoms;Curs;Correu',
      'Jan;Puig Serra;3r Primària;marta@example.com',
      'Aina;Roca;I4;',
    ].join('\n');

    const { rows, problems } = parseChildrenCsv(csv);
    expect(problems).toEqual([]);
    expect(rows).toEqual([
      { name: 'Jan', surname: 'Puig Serra', course: '3PRI', family_email: 'marta@example.com', family_phone: null },
      { name: 'Aina', surname: 'Roca', course: 'I4', family_email: null, family_phone: null },
    ]);
  });

  it('accepts commas, Spanish headings and quoted cells', () => {
    const csv = 'Nombre,Apellidos,Curso\n"García, hijo",Ferrer,2';
    const { rows } = parseChildrenCsv(csv);
    expect(rows[0].course).toBe('2PRI');
  });

  it('understands the ways a course gets written', () => {
    const write = (course: string) => `Nom,Cognoms,Curs\nA,B,${course}`;
    const courseOf = (course: string) => parseChildrenCsv(write(course)).rows[0]?.course;

    expect(courseOf('I3')).toBe('I3');
    expect(courseOf('P4')).toBe('I4');
    expect(courseOf('i5')).toBe('I5');
    expect(courseOf('1')).toBe('1PRI');
    expect(courseOf('6è')).toBe('6PRI');
    expect(courseOf('4t primaria')).toBe('4PRI');
  });

  it('reports the lines it cannot read instead of dropping them', () => {
    const csv = [
      'Nom,Cognoms,Curs',
      'Jan,Puig,3PRI',
      ',Sense nom,I3',
      'Marc,Vidal,segon B',
    ].join('\n');

    const { rows, problems } = parseChildrenCsv(csv);
    expect(rows).toHaveLength(1);
    expect(problems).toEqual([
      { line: 3, reason: 'Falta el nom o els cognoms' },
      { line: 4, reason: 'Curs no reconegut: «segon B»' },
    ]);
  });

  it('refuses a file without the columns it needs, naming them', () => {
    const { rows, problems } = parseChildrenCsv('Alumne,Grup\nJan,3r');
    expect(rows).toEqual([]);
    expect(problems[0].reason).toContain('nom, cognoms i curs');
  });

  it('says so when the file is empty', () => {
    expect(parseChildrenCsv('').problems[0].reason).toBe('El fitxer és buit');
  });
});

describe('findDuplicates', () => {
  const child = (name: string, surname: string, course: string) => ({ name, surname, course });

  it('finds the same child sitting in two courses', () => {
    const roll = [
      child('Jon', 'Calderón castany', '3PRI'),
      child('Jon', 'Calderón castany', '4PRI'),
      child('Aina', 'Roca', 'I4'),
    ];
    const groups = findDuplicates(roll);
    expect(groups).toHaveLength(1);
    expect(groups[0].map((c) => c.course)).toEqual(['3PRI', '4PRI']);
  });

  it('ignores case, accents and stray spaces, which is how duplicates get in', () => {
    const roll = [child('LAURA', 'Blanco Compte', '5PRI'), child(' laura ', 'Blanco Compté', '6PRI')];
    expect(findDuplicates(roll)).toHaveLength(1);
  });

  it('leaves a clean roll alone', () => {
    expect(findDuplicates([child('Jan', 'Puig', '3PRI'), child('Jan', 'Vidal', '3PRI')])).toEqual([]);
  });
});
