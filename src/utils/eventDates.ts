/**
 * Helpers de rango para eventos de varios días.
 *
 * `end_date` es el ÚLTIMO día del evento (inclusivo) y puede llegar null en
 * filas antiguas o desde clientes que solo mandan `event_date`; en ese caso el
 * evento dura un único día. Todas las comparaciones se hacen sobre cadenas
 * `yyyy-MM-dd`, que ordenan igual que las fechas y evitan el desfase de zona
 * horaria de `new Date('yyyy-MM-dd')`.
 */

export interface DatedEvent {
  event_date: string;
  end_date?: string | null;
}

/**
 * Fecha civil `yyyy-MM-dd` de un Date, leída en la zona horaria LOCAL.
 *
 * `toISOString()` convierte antes a UTC, así que en España (UTC+1/+2) el día 1
 * de un mes a las 00:00 se vuelve el último día del mes anterior a las 22:00 y
 * la cadena resultante retrocede un día. Eso hacía que el calendario de abril
 * pidiera "hasta el 29" (perdiendo los eventos del 30) y el de mayo "desde el
 * 30 de abril" (colándolos). Para una fecha sin hora hay que formatear con los
 * getters locales, nunca con toISOString().
 */
export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Hoy en formato `yyyy-MM-dd`, en la zona horaria local. */
export function todayISODate(): string {
  return toLocalISODate(new Date());
}

/** Primer y último día del mes de `date`, ambos inclusivos. */
export function monthRange(date: Date): { from: string; to: string } {
  return {
    from: toLocalISODate(new Date(date.getFullYear(), date.getMonth(), 1)),
    to: toLocalISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

/** Último día del evento; cae en `event_date` cuando no hay rango. */
export function eventEndDate(event: DatedEvent): string {
  return event.end_date || event.event_date;
}

/** True si el evento dura más de un día. */
export function isMultiDay(event: DatedEvent): boolean {
  return eventEndDate(event) > event.event_date;
}

/** True si `dateStr` (yyyy-MM-dd) cae dentro del evento, extremos incluidos. */
export function eventCoversDate(event: DatedEvent, dateStr: string): boolean {
  return event.event_date <= dateStr && dateStr <= eventEndDate(event);
}

/** Número de días que ocupa el evento (1 para los de un solo día). */
export function eventDayCount(event: DatedEvent): number {
  const start = Date.parse(`${event.event_date}T00:00:00Z`);
  const end = Date.parse(`${eventEndDate(event)}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

/** Posición de `dateStr` dentro del rango, para dibujar la barra continua. */
export function eventSegment(event: DatedEvent, dateStr: string) {
  return {
    isStart: dateStr === event.event_date,
    isEnd: dateStr === eventEndDate(event),
  };
}
