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
