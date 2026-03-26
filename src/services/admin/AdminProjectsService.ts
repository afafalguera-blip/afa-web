import { supabase } from '../../lib/supabase';

export interface Project {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  status: 'active' | 'archived';
  display_order: number;
  created_at: string;
  updated_at: string;
  translations?: Record<string, {
    title: string;
    description: string;
    details?: string;
    impact?: string;
    participants?: string;
  }>;
}

export interface ProjectFormData {
  title: string;
  description: string;
  image_url: string;
  translations: Record<string, {
    title: string;
    description: string;
    details: string;
    impact: string;
    participants: string;
  }>;
}

export const AdminProjectsService = {
  async getProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return (data || []) as Project[];
  },

  async deleteProject(id: string): Promise<void> {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
  },

  async toggleArchive(id: string, newStatus: 'active' | 'archived'): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) throw error;
  },

  async saveProject(formData: ProjectFormData, maxOrder: number, editingId?: string): Promise<void> {
    const payload = {
      title: formData.translations.es.title || formData.title,
      description: formData.translations.es.description || formData.description,
      image_url: formData.image_url || null,
      translations: formData.translations
    };

    if (editingId) {
      const { error } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', editingId);

      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('projects')
      .insert([{
        ...payload,
        status: 'active',
        display_order: maxOrder + 1
      }]);

    if (error) throw error;
  }
};
