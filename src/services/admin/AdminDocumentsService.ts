import { supabase } from '../../lib/supabase';

export interface AdminDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  file_url: string;
  file_path: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
}

export interface DocumentUploadData {
  title: string;
  description: string;
  category: string;
  file: File;
}

export const CATEGORIES = [
  'actes', 'normativa', 'general', 'menjador', 'extraescolars'
] as const;

export const AdminDocumentsService = {
  async getAll(): Promise<AdminDocument[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async upload(data: DocumentUploadData): Promise<void> {
    const file = data.file;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${data.category}/${fileName}`;

    // 1. Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    try {
      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // 3. Insert into Database
      const { error: dbError } = await supabase
        .from('documents')
        .insert([{
          title: data.title,
          description: data.description,
          category: data.category,
          file_url: publicUrl,
          file_path: filePath,
          file_type: file.type,
          size_bytes: file.size
        }]);

      if (dbError) throw dbError;
    } catch (error) {
      // Cleanup storage if DB fails
      await supabase.storage
        .from('documents')
        .remove([filePath]);
      throw error;
    }
  },

  async delete(doc: AdminDocument): Promise<void> {
    // 1. Delete from Storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([doc.file_path]);

    if (storageError) {
      console.warn('Storage delete error (continuing with DB):', storageError);
    }

    // 2. Delete from DB
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id);

    if (dbError) throw dbError;
  }
};
