import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  all_day: boolean;
  event_type: string;
  color: string;
  link?: string;
}

export const CalendarService = {
  /**
   * Fetches events and news with dates to show in the calendar
   */
  async getCalendarEvents(currentDate: Date): Promise<CalendarEvent[]> {
    const startDate = format(startOfMonth(subMonths(currentDate, 1)), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(addMonths(currentDate, 1)), 'yyyy-MM-dd');

    // 1. Fetch Calendar Events
    const { data: calendarEvents, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .order('event_date', { ascending: true });

    if (eventsError) throw eventsError;

    // 2. Fetch News with Dates
    const { data: newsItems, error: newsError } = await supabase
      .from('news')
      .select('*')
      .eq('published', true)
      .not('event_date', 'is', null);

    if (newsError) throw newsError;

    // 3. Map News to Calendar Events
    const newsEvents: CalendarEvent[] = (newsItems || [])
      .filter(item => {
        const date = item.event_date?.split('T')[0];
        return date && date >= startDate && date <= endDate;
      })
      .map(item => ({
        id: `news-${item.id}`,
        title: item.title,
        description: item.excerpt,
        event_date: item.event_date!.split('T')[0],
        start_time: item.event_date ? format(new Date(item.event_date), 'HH:mm') : null,
        end_time: null,
        location: null,
        all_day: false,
        event_type: 'news',
        color: '#3b82f6',
        link: `/noticies`
      }));

    return [...(calendarEvents || []), ...newsEvents];
  }
};
