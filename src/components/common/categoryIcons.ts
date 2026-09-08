import { GraduationCap, Palette, Music, Languages, Trophy, type LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

/**
 * Nombre guardado en la base de datos -> icono que se pinta.
 *
 * Los nombres vienen de Material Icons, que es de donde salieron cuando el icono
 * se pintaba con la fuente de Google. Cuando esa fuente no llegaba —red lenta,
 * movil con datos justos— la pagina escribia la palabra en crudo:
 * «description», «chevron_right». Ahora el nombre se traduce a un SVG que ya
 * viaja en el bundle: no hay nada que esperar ni nada que pueda faltar.
 *
 * Vive en su propio fichero y no junto al componente porque el editor de
 * actividades importa la lista de nombres, y react-refresh no deja que un
 * fichero exporte a la vez un componente y una constante.
 */
export const CATEGORY_ICONS: Record<string, ComponentType<LucideProps>> = {
  school: GraduationCap,
  palette: Palette,
  music_note: Music,
  translate: Languages,
  sports_basketball: Trophy,
  sports_skating: Trophy,
  sports: Trophy,
};

/** Icono de cualquier nombre que no este en el mapa. */
export const CATEGORY_ICON_FALLBACK = GraduationCap;

/** Los nombres que ofrece el editor de actividades. */
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);
