import { supabase } from '../../lib/supabase';

export interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: 'news' | 'alert' | 'info';
  link: string | null;
  start_at: string;
  end_at: string | null;
  active: boolean;
  created_at: string;
}

export interface NotificationFormData {
  title: string;
  message: string;
  type: 'news' | 'alert' | 'info';
  link: string;
  start_at: string;
  end_at: string;
  active: boolean;
}

export const AdminNotificationService = {
  async getNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Notification[];
  },

  async saveNotification(formData: NotificationFormData, editingId?: string): Promise<void> {
    const payload = {
      title: formData.title,
      message: formData.message || null,
      type: formData.type,
      link: formData.link || null,
      start_at: new Date(formData.start_at).toISOString(),
      end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
      active: formData.active
    };

    if (editingId) {
      const { error } = await supabase
        .from('notifications')
        .update(payload)
        .eq('id', editingId);

      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('notifications')
      .insert([payload]);

    if (error) throw error;
  },

  async toggleActive(id: string, active: boolean): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ active })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteNotification(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
