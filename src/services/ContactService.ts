import { supabase } from "../lib/supabase";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'archived';
  created_at: string;
}

export const ContactService = {
  async submitMessage(message: Omit<ContactMessage, 'id' | 'status' | 'created_at'>): Promise<void> {
    const { error } = await supabase
      .from('contact_messages')
      .insert([message]);

    if (error) throw error;
  },

  async getAll(): Promise<ContactMessage[]> {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('contact_messages')
      .update({ status: 'read' })
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async archive(id: string): Promise<void> {
    const { error } = await supabase
      .from('contact_messages')
      .update({ status: 'archived' })
      .eq('id', id);

    if (error) throw error;
  }
};
