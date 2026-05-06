import { supabase } from '../lib/supabase';
import { compressImage } from '../utils/imageCompression';

export type BoardRoleKey =
  | 'president'
  | 'vicepresident'
  | 'treasurer'
  | 'secretary'
  | 'vocal';

export interface BoardMemberTranslations {
  [lang: string]: {
    role?: string;
    bio?: string;
  };
}

export interface BoardMember {
  id: string;
  name: string;
  role: string;
  role_key: BoardRoleKey;
  bio: string | null;
  email: string | null;
  photo_url: string | null;
  display_order: number;
  is_visible: boolean;
  translations: BoardMemberTranslations | null;
  created_at: string;
  updated_at: string;
}

export interface BoardMemberInput {
  name: string;
  role: string;
  role_key: BoardRoleKey;
  bio?: string | null;
  email?: string | null;
  photo_url?: string | null;
  display_order?: number;
  is_visible?: boolean;
  translations?: BoardMemberTranslations | null;
}

export interface BoardSectionConfig {
  translations?: {
    ca?: { title: string; subtitle: string; mission: string; composition_title: string; composition_intro: string };
    es?: { title: string; subtitle: string; mission: string; composition_title: string; composition_intro: string };
    en?: { title: string; subtitle: string; mission: string; composition_title: string; composition_intro: string };
  };
}

export const BoardService = {
  async listVisible(): Promise<BoardMember[]> {
    const { data, error } = await supabase
      .from('board_members')
      .select('*')
      .eq('is_visible', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching board members:', error);
      return [];
    }
    return (data || []) as BoardMember[];
  },

  async listAll(): Promise<BoardMember[]> {
    const { data, error } = await supabase
      .from('board_members')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return (data || []) as BoardMember[];
  },

  async create(input: BoardMemberInput): Promise<BoardMember> {
    const { data, error } = await supabase
      .from('board_members')
      .insert([{
        name: input.name,
        role: input.role,
        role_key: input.role_key,
        bio: input.bio ?? null,
        email: input.email ?? null,
        photo_url: input.photo_url ?? null,
        display_order: input.display_order ?? 0,
        is_visible: input.is_visible ?? true,
        translations: input.translations ?? null,
      }])
      .select('*')
      .single();

    if (error) throw error;
    return data as BoardMember;
  },

  async update(id: string, patch: Partial<BoardMemberInput>): Promise<BoardMember> {
    const { data, error } = await supabase
      .from('board_members')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as BoardMember;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('board_members').delete().eq('id', id);
    if (error) throw error;
  },

  async reorder(ids: string[]): Promise<void> {
    await Promise.all(
      ids.map((id, idx) =>
        supabase.from('board_members').update({ display_order: idx }).eq('id', id)
      )
    );
  },

  async uploadPhoto(file: File): Promise<string> {
    const compressed = await compressImage(file, { maxWidth: 600, maxHeight: 600, quality: 0.85 });
    const ext = compressed.name.split('.').pop() || 'jpg';
    const fileName = `member_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = `board/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('site-assets')
      .upload(filePath, compressed);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('site-assets').getPublicUrl(filePath);
    return data.publicUrl;
  },

  async getSectionConfig(): Promise<BoardSectionConfig | null> {
    const { data, error } = await supabase
      .from('site_config')
      .select('value')
      .eq('key', 'board')
      .maybeSingle();

    if (error) {
      console.error('Error fetching board section config:', error);
      return null;
    }
    return (data?.value as BoardSectionConfig) ?? null;
  },

  async updateSectionConfig(config: BoardSectionConfig): Promise<void> {
    const { error } = await supabase
      .from('site_config')
      .upsert({ key: 'board', value: config, updated_at: new Date().toISOString() });

    if (error) throw error;
  },
};
