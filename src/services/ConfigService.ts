import { supabase } from "../lib/supabase";

export interface HeroConfig {
  image_url: string;
  title: string;
}

export interface ContactConfig {
  email: string;
  phone: string;
  address: string;
  schedule: string;
  schedule_info: string;
}

export interface SocialConfig {
  instagram: string;
  twitter: string;
  facebook: string;
}

export interface AboutConfig {
  translations: {
    ca: { text: string; functions: string[] };
    es: { text: string; functions: string[] };
    en: { text: string; functions: string[] };
  };
}

export interface LegalConfig {
  ca: string;
  es: string;
  en: string;
}

export interface ShopConfig {
  translations: {
    ca: string;
    es: string;
    en: string;
  };
  categories: {
    id: string;
    translations: {
      ca: string;
      es: string;
      en: string;
    };
  }[];
  admin_emails: string[];
}

export const ConfigService = {
  async getConfig<T>(key: 'hero' | 'contact' | 'social' | 'about' | 'privacy' | 'cookies' | 'shop'): Promise<T | null> {
    const { data, error } = await supabase
      .from('site_config')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      console.error(`Error fetching ${key} config:`, error);
      return null;
    }
    return data.value as T;
  },

  async updateConfig<T>(key: 'hero' | 'contact' | 'social' | 'about' | 'privacy' | 'cookies' | 'shop', config: T): Promise<void> {
    const { error } = await supabase
      .from('site_config')
      .update({ value: config, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) throw error;
  },

  async getHeroConfig(): Promise<HeroConfig | null> {
    return this.getConfig<HeroConfig>('hero');
  },

  async updateHeroConfig(config: HeroConfig): Promise<void> {
    return this.updateConfig('hero', config);
  },

  async getContactConfig(): Promise<ContactConfig | null> {
    return this.getConfig<ContactConfig>('contact');
  },

  async updateContactConfig(config: ContactConfig): Promise<void> {
    return this.updateConfig('contact', config);
  },

  async getSocialConfig(): Promise<SocialConfig | null> {
    return this.getConfig<SocialConfig>('social');
  },

  async updateSocialConfig(config: SocialConfig): Promise<void> {
    return this.updateConfig('social', config);
  },

  async getAboutConfig(): Promise<AboutConfig | null> {
    return this.getConfig<AboutConfig>('about');
  },

  async updateAboutConfig(config: AboutConfig): Promise<void> {
    return this.updateConfig('about', config);
  },

  async getPrivacyConfig(): Promise<LegalConfig | null> {
    return this.getConfig<LegalConfig>('privacy');
  },

  async updatePrivacyConfig(config: LegalConfig): Promise<void> {
    return this.updateConfig('privacy', config);
  },

  async getCookiesConfig(): Promise<LegalConfig | null> {
    return this.getConfig<LegalConfig>('cookies');
  },

  async updateCookiesConfig(config: LegalConfig): Promise<void> {
    return this.updateConfig('cookies', config);
  },

  async getShopConfig(): Promise<ShopConfig | null> {
    return this.getConfig<ShopConfig>('shop');
  },

  async updateShopConfig(config: ShopConfig): Promise<void> {
    return this.updateConfig('shop', config);
  },

  async uploadHeroImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `hero_${Date.now()}.${fileExt}`;
    const filePath = `hero/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('site-assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('site-assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};
