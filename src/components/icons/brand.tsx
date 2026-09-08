import { createLucideIcon } from 'lucide-react';

/**
 * Iconos de marca (Instagram, X/Twitter, Facebook).
 *
 * lucide-react 1.0 eliminó todos los logotipos de marca del paquete. Se
 * reconstruyen aquí con `createLucideIcon`, con los mismos trazos que traía
 * lucide 0.x, para que sigan siendo `LucideIcon` de verdad: mismo tipo, mismas
 * props (`size`, `className`, `strokeWidth`) y el mismo grosor de línea que el
 * resto de iconos de la web.
 */

export const Instagram = createLucideIcon('Instagram', [
  ['rect', { width: '20', height: '20', x: '2', y: '2', rx: '5', ry: '5', key: 'marca-ig-rect' }],
  ['path', { d: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z', key: 'marca-ig-lente' }],
  ['line', { x1: '17.5', x2: '17.51', y1: '6.5', y2: '6.5', key: 'marca-ig-flash' }],
]);

export const Twitter = createLucideIcon('Twitter', [
  [
    'path',
    {
      d: 'M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z',
      key: 'marca-tw-pajaro',
    },
  ],
]);

export const Facebook = createLucideIcon('Facebook', [
  [
    'path',
    {
      d: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
      key: 'marca-fb-f',
    },
  ],
]);
