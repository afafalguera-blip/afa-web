import { supabase } from "../lib/supabase";
import { compressImage } from "../utils/imageCompression";

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
  translations?: {
    ca: { text: string, functions: string[] },
    es: { text: string, functions: string[] },
    en: { text: string, functions: string[] }
  };
  // Legacy fields
  text?: string;
  functions?: string[];
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

export interface FeesConfig {
  annual_fee_amount: number;
  iban: string;
  bank_name: string;
  account_holder: string;
  payment_reference_template: string;
}

export interface PricingTier {
  id: string;
  label: { ca: string; es: string; en: string };
  schedule: string;
  member_price: number;
  non_member_price: number;
  note?: { ca: string; es: string; en: string };
}

export interface PricingConfig {
  tiers: PricingTier[];
  discount_text: { ca: string; es: string; en: string };
}

export interface BrandingConfig {
  site_name: string;
  logo_url: string;
  default_hero_url: string;
  default_placeholder_url: string;
  default_seo_description: { ca: string; es: string; en: string };
}

export interface AnalyticsConfig {
  google_analytics_id: string;
  enabled: boolean;
}

export interface HomepageConfig {
  featured_news_count: number;
  featured_events_count: number;
  featured_projects_count: number;
  max_students_per_inscription: number;
  calendar_events_per_day: number;
  assemblea_pdf_url: string;
}

const CONFIG_CACHE_PREFIX = 'afa_config_';
const CONFIG_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCachedConfig<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CONFIG_CACHE_PREFIX + key);
    if (!raw) return null;
    const { value, ts } = JSON.parse(raw);
    if (Date.now() - ts > CONFIG_CACHE_TTL) return null;
    return value as T;
  } catch {
    return null;
  }
}

function setCachedConfig<T>(key: string, value: T): void {
  try {
    localStorage.setItem(CONFIG_CACHE_PREFIX + key, JSON.stringify({ value, ts: Date.now() }));
  } catch { /* localStorage full — ignore */ }
}

export const ConfigService = {
  async getConfig<T>(key: 'hero' | 'contact' | 'social' | 'about' | 'privacy' | 'cookies' | 'shop' | 'fees' | 'pricing' | 'branding' | 'analytics' | 'homepage'): Promise<T | null> {
    // Return cached value if fresh
    const cached = getCachedConfig<T>(key);
    if (cached !== null) return cached;

    const { data, error } = await supabase
      .from('site_config')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      console.error(`Error fetching ${key} config:`, error);
      return null;
    }

    setCachedConfig(key, data.value);
    return data.value as T;
  },

  async updateConfig<T>(key: 'hero' | 'contact' | 'social' | 'about' | 'privacy' | 'cookies' | 'shop' | 'fees' | 'pricing' | 'branding' | 'analytics' | 'homepage', config: T): Promise<void> {
    const { error } = await supabase
      .from('site_config')
      .update({ value: config, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) throw error;

    // Invalidate cache so next read fetches fresh data
    try { localStorage.removeItem(CONFIG_CACHE_PREFIX + key); } catch { /* ignore */ }
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

  async getFeesConfig(): Promise<FeesConfig | null> {
    return this.getConfig<FeesConfig>('fees');
  },

  async updateFeesConfig(config: FeesConfig): Promise<void> {
    return this.updateConfig('fees', config);
  },

  async getPricingConfig(): Promise<PricingConfig | null> {
    return this.getConfig<PricingConfig>('pricing');
  },

  async updatePricingConfig(config: PricingConfig): Promise<void> {
    return this.updateConfig('pricing', config);
  },

  async getBrandingConfig(): Promise<BrandingConfig | null> {
    return this.getConfig<BrandingConfig>('branding');
  },

  async updateBrandingConfig(config: BrandingConfig): Promise<void> {
    return this.updateConfig('branding', config);
  },

  async getAnalyticsConfig(): Promise<AnalyticsConfig | null> {
    return this.getConfig<AnalyticsConfig>('analytics');
  },

  async updateAnalyticsConfig(config: AnalyticsConfig): Promise<void> {
    return this.updateConfig('analytics', config);
  },

  async getHomepageConfig(): Promise<HomepageConfig | null> {
    return this.getConfig<HomepageConfig>('homepage');
  },

  async updateHomepageConfig(config: HomepageConfig): Promise<void> {
    return this.updateConfig('homepage', config);
  },

  async uploadBrandingImage(file: File, prefix: string): Promise<string> {
    // Compress logo/branding images (max 400px for logos)
    const compressed = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.85 });
    const fileExt = compressed.name.split('.').pop();
    const fileName = `${prefix}_${Date.now()}.${fileExt}`;
    const filePath = `branding/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('site-assets')
      .upload(filePath, compressed);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('site-assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async uploadHeroImage(file: File): Promise<string> {
    // Compress hero images (max 1600px wide for hero banners)
    const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 900, quality: 0.80 });
    const fileExt = compressed.name.split('.').pop();
    const fileName = `hero_${Date.now()}.${fileExt}`;
    const filePath = `hero/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('site-assets')
      .upload(filePath, compressed);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('site-assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};
