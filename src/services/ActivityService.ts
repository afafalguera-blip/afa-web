import { supabase } from '../lib/supabase';

export interface ScheduleSession {
  day: number; // 1 (Mon) - 5 (Fri)
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface ScheduleDetail {
  group: string;
  sessions: ScheduleSession[];
}

export interface Activity {
  id: number;
  created_at?: string;
  title: string;
  title_es?: string;
  title_ca?: string;
  title_en?: string;
  category: string;
  description: string;
  description_es?: string;
  description_ca?: string;
  description_en?: string;
  price: number;
  price_member?: number;
  price_non_member?: number;
  price_info: string;
  grades: string;
  grades_es?: string;
  grades_ca?: string;
  grades_en?: string;
  schedule_summary: string;
  schedule_summary_es?: string;
  schedule_summary_ca?: string;
  schedule_summary_en?: string;
  schedule_details: ScheduleDetail[]; // Structured JSON
  place: string;
  spots: number;
  image_url: string;
  color: string;
  category_icon: string;
  is_stem_approved: boolean;
  important_note?: string;
  important_note_es?: string;
  important_note_ca?: string;
  important_note_en?: string;
}

export const ActivityService = {
  async getAll() {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) throw error;
    return data as Activity[];
  },

  async create(activity: Omit<Activity, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('activities')
      .insert([activity])
      .select()
      .single();
    
    if (error) throw error;
    return data as Activity;
  },

  async update(id: number, updates: Partial<Activity>) {
    const { data, error } = await supabase
      .from('activities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Activity;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async uploadImage(file: File) {
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error: uploadError } = await supabase.storage
      .from('activity-images')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('activity-images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }
};
