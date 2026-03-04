import { supabase } from '../lib/supabase';

export interface PublicDocument {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string;
  file_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export const DocumentsService = {
  /**
   * Fetches all public documents from the database
   */
  async getDocuments(): Promise<PublicDocument[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error in DocumentsService.getDocuments:', error);
      throw error;
    }

    return data || [];
  }
};
