import { supabase } from "../lib/supabase";

export interface Announcement {
  id: string;
  is_active: boolean;
  message: string;
  type: 'info' | 'warning' | 'success';
  link?: string;
  updated_at?: string;
}

export const AnnouncementService = {
  async getLatest(): Promise<Announcement | null> {
    const { data, error } = await supabase
      .from('site_announcements')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      console.error('Error fetching announcement:', error);
      return null;
    }
    return data;
  },

  async update(announcement: Partial<Announcement>): Promise<void> {
    const { error } = await supabase
      .from('site_announcements')
      .update(announcement)
      .eq('id', '00000000-0000-0000-0000-000000000001'); // Fixed ID for the primary banner

    if (error) throw error;
  },

  async toggleActive(isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('site_announcements')
      .update({ is_active: isActive })
      .eq('id', '00000000-0000-0000-0000-000000000001');

    if (error) throw error;
  }
};
