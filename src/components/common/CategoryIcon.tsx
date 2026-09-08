import type { LucideProps } from 'lucide-react';
import { CATEGORY_ICONS, CATEGORY_ICON_FALLBACK } from './categoryIcons';

// `name` en LucideProps es el atributo name del SVG, asi que el nombre guardado
// en la base de datos viaja aparte.
interface CategoryIconProps extends Omit<LucideProps, 'name'> {
  icon: string | null | undefined;
}

/** El icono de una actividad, a partir del nombre que hay en la base de datos. */
export function CategoryIcon({ icon, ...props }: CategoryIconProps) {
  const Icono = (icon && CATEGORY_ICONS[icon]) || CATEGORY_ICON_FALLBACK;
  return <Icono {...props} />;
}
