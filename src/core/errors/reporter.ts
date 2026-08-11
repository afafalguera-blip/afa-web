import { supabase } from '../../lib/supabase';

/**
 * Reporte de errores de navegador a la tabla `client_errors`.
 *
 * Reglas de diseño, todas por el mismo motivo — esto corre en el navegador de
 * una familia y no puede molestar ni costar dinero:
 *
 * - **Nunca lanza.** Un fallo reportando un fallo no puede tumbar la página.
 * - **Agrupa por huella.** El mismo error repetido no se manda cien veces.
 * - **Tiene tope por sesión.** Un bucle de render no puede escribir sin freno.
 * - **No manda nada en desarrollo**, donde ya está la consola.
 */

export type ErrorKind = 'render' | 'window' | 'promise' | 'manual';

export interface ErrorReport {
  fingerprint: string;
  kind: ErrorKind;
  message: string;
  stack: string | null;
  source: string | null;
  page_url: string | null;
  user_agent: string | null;
  app_version: string | null;
  user_id: string | null;
}

/** Límites de la tabla (ver constraint `client_errors_limites`). */
const MAX = {
  fingerprint: 64,
  message: 2000,
  stack: 8000,
  source: 500,
  page_url: 1000,
  user_agent: 400,
  app_version: 100,
} as const;

/** Reportes distintos que se aceptan por carga de página. */
const MAX_POR_SESION = 20;
/** Ventana en la que un mismo error no se repite. */
const VENTANA_REPETICION_MS = 60_000;

const vistos = new Map<string, number>();
let enviados = 0;
let instalado = false;

const recorta = (value: string | null | undefined, max: number): string | null => {
  if (!value) return null;
  const texto = String(value).trim();
  if (!texto) return null;
  return texto.length > max ? texto.slice(0, max) : texto;
};

/**
 * Huella estable del error: tipo + mensaje + primer marco de la pila. Se
 * normalizan los números (líneas, columnas, ids) para que dos ocurrencias del
 * mismo fallo no cuenten como fallos distintos.
 */
export function calcularHuella(kind: ErrorKind, message: string, stack?: string | null): string {
  const primerMarco = (stack ?? '').split('\n').find((l) => l.includes('at ') || l.includes('@')) ?? '';
  const base = `${kind}|${message}|${primerMarco}`
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // djb2: corto, estable y sin dependencias. No necesita ser criptográfico.
  let hash = 5381;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) + hash + base.charCodeAt(i)) | 0;
  }
  return `e${(hash >>> 0).toString(36)}${base.length.toString(36)}`;
}

/** True si este error toca mandarlo ahora. Actualiza el estado de agrupación. */
export function debeEnviar(huella: string, ahora = Date.now()): boolean {
  const anterior = vistos.get(huella);
  if (anterior !== undefined && ahora - anterior < VENTANA_REPETICION_MS) return false;
  if (enviados >= MAX_POR_SESION) return false;

  vistos.set(huella, ahora);
  enviados += 1;
  return true;
}

export function construirReporte(
  kind: ErrorKind,
  error: unknown,
  extra: { source?: string | null; userId?: string | null } = {},
): ErrorReport {
  const esError = error instanceof Error;
  const message = recorta(esError ? error.message : String(error), MAX.message) ?? 'Error sin mensaje';
  const stack = recorta(esError ? error.stack : null, MAX.stack);

  return {
    fingerprint: calcularHuella(kind, message, stack),
    kind,
    message,
    stack,
    source: recorta(extra.source, MAX.source),
    page_url: recorta(typeof location !== 'undefined' ? location.href : null, MAX.page_url),
    user_agent: recorta(typeof navigator !== 'undefined' ? navigator.userAgent : null, MAX.user_agent),
    app_version: recorta(import.meta.env.VITE_APP_VERSION ?? import.meta.env.MODE, MAX.app_version),
    user_id: extra.userId ?? null,
  };
}

/** Envía el reporte. Nunca lanza: como mucho, se pierde el reporte. */
export async function reportarError(
  kind: ErrorKind,
  error: unknown,
  extra: { source?: string | null; userId?: string | null } = {},
): Promise<boolean> {
  try {
    // En desarrollo la consola ya lo enseña, y ensuciaría la tabla de producción.
    if (import.meta.env.DEV) return false;

    const reporte = construirReporte(kind, error, extra);
    if (!debeEnviar(reporte.fingerprint)) return false;

    const { error: fallo } = await supabase.from('client_errors').insert([reporte]);
    return !fallo;
  } catch {
    return false;
  }
}

/**
 * Engancha los dos agujeros por los que se escapa lo que el ErrorBoundary de
 * React no ve: errores fuera del árbol y promesas rechazadas sin `catch`.
 */
export function instalarCapturaGlobal(): void {
  if (instalado || typeof window === 'undefined') return;
  instalado = true;

  window.addEventListener('error', (evento) => {
    void reportarError('window', evento.error ?? evento.message, {
      source: evento.filename ? `${evento.filename}:${evento.lineno}:${evento.colno}` : null,
    });
  });

  window.addEventListener('unhandledrejection', (evento) => {
    void reportarError('promise', evento.reason);
  });
}

/** Solo para tests: devuelve el reportero a su estado inicial. */
export function reiniciarReporter(): void {
  vistos.clear();
  enviados = 0;
  instalado = false;
}
