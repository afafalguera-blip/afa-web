import { supabase } from '../../../lib/supabase';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  all_day: boolean;
  color: string | null;
  event_type: string | null;
}

export const EventsService = {
  async getUpcomingEvents(limit: number = 4): Promise<CalendarEvent[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      // Un evento en curso sigue siendo "proximo" hasta su ultimo dia.
      .gte('end_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
    return data || [];
  }
};
