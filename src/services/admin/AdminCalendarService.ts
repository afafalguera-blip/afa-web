import { supabase } from '../../lib/supabase';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
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
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', startOfMonth.toISOString().split('T')[0])
      .lte('event_date', endOfMonth.toISOString().split('T')[0])
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
      location: formData.location || null
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
