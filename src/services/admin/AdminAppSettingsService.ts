import { supabase } from '../../lib/supabase';

export type AppSettingKey = 'GEMINI_API_KEY';

export interface AppSettingMeta {
  key: AppSettingKey;
  is_set: boolean;
  masked: string;
  updated_at: string | null;
  updated_by_email: string | null;
}

export const APP_SETTING_DEFINITIONS: { key: AppSettingKey; description: string }[] = [
  {
    key: 'GEMINI_API_KEY',
    description: 'API key de Google Gemini para auto-traducción ES → CA/EN',
  },
];

const EMPTY_META = (key: AppSettingKey): AppSettingMeta => ({
  key,
  is_set: false,
  masked: '',
  updated_at: null,
  updated_by_email: null,
});

export const AppSettingsService = {
  async getMeta(key: AppSettingKey): Promise<AppSettingMeta> {
    const { data, error } = await supabase.rpc('admin_get_app_setting_meta', { p_key: key });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return EMPTY_META(key);
    return {
      key,
      is_set: !!row.is_set,
      masked: row.masked ?? '',
      updated_at: row.updated_at ?? null,
      updated_by_email: row.updated_by_email ?? null,
    };
  },

  async set(key: AppSettingKey, value: string): Promise<void> {
    const { error } = await supabase.rpc('admin_set_app_setting', { p_key: key, p_value: value });
    if (error) throw error;
  },

  async remove(key: AppSettingKey): Promise<void> {
    const { error } = await supabase.rpc('admin_delete_app_setting', { p_key: key });
    if (error) throw error;
  },
};
