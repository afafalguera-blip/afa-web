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

export type ContactStatusFilter = 'all' | ContactMessage['status'];

export interface ContactListParams {
  /** 1-based. */
  page: number;
  pageSize: number;
  search?: string;
  status?: ContactStatusFilter;
}

export interface ContactListResult {
  rows: ContactMessage[];
  total: number;
}

/**
 * PostgREST `or=` groups are comma/parenthesis delimited, so those characters
 * cannot appear raw inside a value. Backslash and LIKE wildcards are escaped so
 * the term is matched literally.
 */
const sanitizeOrTerm = (value: string) =>
  value
    .replace(/[\\%_]/g, (match) => `\\${match}`)
    .replace(/[(),*"]/g, ' ')
    .trim();

export const ContactService = {
  async submitMessage(message: Omit<ContactMessage, 'id' | 'status' | 'created_at'>): Promise<void> {
    const { error } = await supabase
      .from('contact_messages')
      .insert([message]);

    if (error) throw error;
  },

  /** Server-side paginated list. Search and status filter both run on the server. */
  async list({ page, pageSize, search, status = 'all' }: ContactListParams): Promise<ContactListResult> {
    const offset = (Math.max(1, page) - 1) * pageSize;

    let query = supabase.from('contact_messages').select('*', { count: 'exact' });

    if (status !== 'all') query = query.eq('status', status);

    const term = search ? sanitizeOrTerm(search) : '';
    if (term) {
      query = query.or(`name.ilike.%${term}%,subject.ilike.%${term}%,email.ilike.%${term}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    return { rows: (data || []) as ContactMessage[], total: count ?? 0 };
  },

  /** Inbox badge: counted server-side so it stays accurate across pages. */
  async countUnread(): Promise<number> {
    const { count, error } = await supabase
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'unread');

    if (error) throw error;
    return count ?? 0;
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
