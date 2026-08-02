import { supabase } from '../../lib/supabase';
import { monthRange } from '../../utils/eventDates';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  /** Ultimo dia del evento, inclusivo. Igual a event_date si dura un dia. */
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  all_day: boolean;
  event_type: 'general' | 'meeting' | 'celebration' | 'deadline' | 'activity';
  color: string;
  created_at: string;
}

export type EventFormData = Omit<CalendarEvent, 'id' | 'created_at'>;

export const EVENT_TYPES = [
  { value: 'general', label: 'General', color: '#3b82f6' },
  { value: 'meeting', label: 'Reunión', color: '#8b5cf6' },
  { value: 'celebration', label: 'Celebración', color: '#ec4899' },
  { value: 'deadline', label: 'Fecha límite', color: '#ef4444' },
  { value: 'activity', label: 'Actividad', color: '#22c55e' }
] as const;

export const AdminCalendarService = {
  async getEventsForMonth(currentMonth: Date): Promise<CalendarEvent[]> {
    // monthRange formatea en horario local: toISOString() convertiria a UTC y
    // desplazaria ambos extremos un dia hacia atras.
    const { from, to } = monthRange(currentMonth);

    // Solape de intervalos: un evento entra en el mes si empieza antes de que
    // acabe y termina despues de que empiece. Filtrar solo por event_date
    // dejaria fuera los rangos que vienen del mes anterior (p.ej. Semana Santa
    // a caballo entre marzo y abril).
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .lte('event_date', to)
      .gte('end_date', from)
      .order('event_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async saveEvent(formData: EventFormData, id?: string): Promise<void> {
    const eventData = {
      ...formData,
      start_time: formData.all_day ? null : formData.start_time || null,
      end_time: formData.all_day ? null : formData.end_time || null,
      description: formData.description || null,
      location: formData.location || null,
      // Un solo dia => end_date se iguala a event_date (el trigger de la BD
      // hace lo mismo si llegara null, pero lo dejamos explicito).
      end_date: formData.end_date || formData.event_date
    };

    if (id) {
      const { error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('events')
        .insert([eventData]);
      if (error) throw error;
    }
  },

  async deleteEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
