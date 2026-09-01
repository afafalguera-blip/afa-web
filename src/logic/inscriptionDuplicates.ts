/**
 * @fileoverview Detección de inscripciones repetidas dentro de un curso
 * escolar. Lógica pura, sin framework, probada en
 * `src/tests/inscriptionDuplicates.test.ts`.
 *
 * POR QUÉ EXISTE: una fila de `inscripcions` es una FAMILIA, no una criatura.
 * En el listado del panel, dos envíos de la misma familia se ven idénticos
 * (mismo nombre, DNI, correo y teléfono) y lo único que los distingue es la
 * columna de alumnos. Eso ya ha costado un borrado por error.
 *
 * La distinción que importa no es «repetida / no repetida», son dos casos muy
 * distintos:
 *
 *   - `exact`  — el mismo formulario enviado dos veces: mismas criaturas, mismo
 *                curso, mismas actividades. Nunca es legítimo (la familia no vio
 *                el correo de confirmación y reenvió). Se puede borrar el más
 *                nuevo sin perder nada.
 *   - `family` — la misma familia con inscripciones DISTINTAS: una por criatura,
 *                o una ampliación con un hermano o una actividad más. Borrar
 *                una pierde datos que no están en la otra.
 */

import type { Inscription, InscriptionStudent } from '../types/inscription';

export type DuplicateKind = 'exact' | 'family';

export interface DuplicateInfo {
  kind: DuplicateKind;
  /** Las otras inscripciones de la misma familia, de la más antigua a la más nueva. */
  others: string[];
  /** Subconjunto de `others` con exactamente las mismas criaturas y actividades. */
  exactOthers: string[];
}

/** Mapa `id de inscripción` → repetición detectada. Solo lleva las repetidas. */
export type DuplicateMap = Record<string, DuplicateInfo>;

const normalize = (value?: string | null): string => (value ?? '').trim().toLowerCase();

/** El DNI se escribe con y sin guion, y con espacios de sobra. */
const normalizeDni = (value?: string | null): string => normalize(value).replace(/[\s.-]/g, '');

/**
 * Claves por las que dos filas son «la misma familia». Correo y DNI van por
 * separado a propósito: una familia puede repetir el correo y equivocarse al
 * teclear el DNI, o al revés, y sigue siendo la misma.
 */
const contactKeys = (inscription: Inscription): string[] => {
  const keys: string[] = [];
  const email = normalize(inscription.parent_email_1);
  const dni = normalizeDni(inscription.parent_dni);
  if (email) keys.push(`email:${email}`);
  if (dni) keys.push(`dni:${dni}`);
  return keys;
};

/**
 * Huella de las criaturas de una inscripción. Dos inscripciones con la misma
 * huella piden exactamente lo mismo.
 *
 * Ordena criaturas y actividades: que la familia teclee a los hermanos en otro
 * orden no las convierte en inscripciones distintas. Y normaliza espacios y
 * mayúsculas, que es lo que distingue este caso de una comparación literal:
 * en producción hay dos envíos de la misma familia que solo se diferencian en
 * un espacio al final del nombre.
 *
 * GEMELA de `public.inscripcio_signatura(jsonb)`, en
 * supabase/migrations/20260901190000_inscripcio_signatura.sql. Las dos tienen
 * que dar lo mismo para los mismos datos: esta decide qué etiqueta se pinta en
 * el panel, la de la base decide qué envío se rechaza. Que discrepen
 * significaría avisar de algo que no se frena, o al revés. Si se toca una, se
 * toca la otra.
 */
export function studentsSignature(students: InscriptionStudent[]): string {
  return students
    .map((student) =>
      [
        `${normalize(student.name)} ${normalize(student.surname)}`.trim().replace(/\s+/g, ' '),
        normalize(student.course),
        (student.activities ?? [])
          .map(normalize)
          .filter(Boolean)
          .sort()
          .join('|'),
      ].join('#')
    )
    .sort()
    .join('||');
}

/**
 * Agrupa por familia (correo o DNI compartido) y, dentro de cada grupo, marca
 * las que además piden exactamente lo mismo.
 *
 * Se le pasa el curso escolar entero, no una página: dos envíos de la misma
 * familia con días de diferencia caen en páginas distintas y es justo entonces
 * cuando uno parece sobrar.
 */
export function findDuplicates(inscriptions: Inscription[]): DuplicateMap {
  // Union-find sobre los ids: una familia puede encadenarse por el correo con
  // una fila y por el DNI con otra, y las tres son el mismo grupo.
  const parent = new Map<string, string>();

  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root) as string;
    let cursor = id;
    while (parent.get(cursor) !== root) {
      const next = parent.get(cursor) as string;
      parent.set(cursor, root);
      cursor = next;
    }
    return root;
  };

  const union = (a: string, b: string): void => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  };

  for (const inscription of inscriptions) parent.set(inscription.id, inscription.id);

  const firstWithKey = new Map<string, string>();
  for (const inscription of inscriptions) {
    for (const key of contactKeys(inscription)) {
      const seen = firstWithKey.get(key);
      if (seen) union(seen, inscription.id);
      else firstWithKey.set(key, inscription.id);
    }
  }

  const groups = new Map<string, Inscription[]>();
  for (const inscription of inscriptions) {
    const root = find(inscription.id);
    const group = groups.get(root);
    if (group) group.push(inscription);
    else groups.set(root, [inscription]);
  }

  const result: DuplicateMap = {};

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const ordered = [...group].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    const signatures = new Map<string, string>();
    for (const inscription of ordered) {
      signatures.set(inscription.id, studentsSignature(inscription.students));
    }

    for (const inscription of ordered) {
      const own = signatures.get(inscription.id);
      const others = ordered.filter((item) => item.id !== inscription.id).map((item) => item.id);
      const exactOthers = others.filter((id) => signatures.get(id) === own);

      result[inscription.id] = {
        kind: exactOthers.length > 0 ? 'exact' : 'family',
        others,
        exactOthers,
      };
    }
  }

  return result;
}
