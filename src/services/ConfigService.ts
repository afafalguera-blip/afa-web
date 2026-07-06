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
  // Optional overrides for the two price line captions (default: "socis" / "no socis").
  // Used e.g. for English, billed per pupil as "1 dia" / "2 dies".
  member_price_label?: { ca: string; es: string; en: string };
  non_member_price_label?: { ca: string; es: string; en: string };
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

export interface MenjadorInfoBlock {
  intro: string;
  schedule: string;
  company: string;
  allergies: string;
  diets: string;
  how_to: string;
  contact: string;
}

export interface MenjadorInfoConfig {
  translations: {
    ca: MenjadorInfoBlock;
    es: MenjadorInfoBlock;
    en: MenjadorInfoBlock;
  };
}

export interface SeasonConfig {
  active_year: string;          // e.g. "2026-27"
  inscriptions_open: boolean;   // is the public inscription form accepting entries?
  open_at: string | null;       // ISO date, informational
  close_at: string | null;      // ISO date, informational
}

// Socialization-book prices per course code (I3..6PRI). `default` applies to
// any course not present in `map`. A price of 0 skips that course on generation.
export interface BookPricesConfig {
  default: number;
  map: Record<string, number>;
}

// Configurable monthly-fee rules applied on top of per-activity prices.
export interface FeeRulesConfig {
  // Activity titles NOT billed by the AFA (e.g. English → external academy).
  exclude_titles: string[];
  // Flat combined price when a pupil takes >= min_activities billable activities.
  multiactivity: {
    min_activities: number;
    member_price: number;
    non_member_price: number;
  };
}

export type Lang = 'ca' | 'es' | 'en';
export type LangText = { ca: string; es: string; en: string };

// Per-language editable text content for the inscription form.
// Every field is optional: empty/missing falls back to the i18n string.
export interface InscriptionContentBlock {
  title_prefix?: string;
  title_highlight?: string;
  subtitle_prefix?: string;
  subtitle_highlight?: string;
  subtitle_suffix?: string;
  info_box_title?: string;
  info_box_text?: string;
  important_info_title?: string;
  important_info_text?: string;
  english_warning_title?: string;
  english_warning_body?: string;
  payment_method_title?: string;
  payment_method_body?: string;
  iban_hint?: string;
  terms_accept?: string;
  terms_link?: string;
  terms_url?: string;
  student_section?: string;
  parent_section?: string;
  additional_section?: string;
  pricing_title?: string;
  submit_btn?: string;
  privacy_note?: string;
  success_title?: string;
  success_message?: string;
}

// The configurable existing optional fields. `key` maps to a fixed slot
// in the form/payload; admin can only toggle/relabel.
export type OptionalFieldKey =
  | 'parent_dni'
  | 'parent_phone_2'
  | 'parent_email_2'
  | 'health_info'
  | 'image_rights'
  | 'leave_alone';

export interface OptionalFieldConfig {
  key: OptionalFieldKey;
  enabled: boolean;
  required: boolean;
  label: LangText;
  helpText?: LangText;
}

export type CustomQuestionType = 'text' | 'long_text' | 'select';

export interface CustomQuestion {
  key: string;              // stable slug, used as extra_answers key
  type: CustomQuestionType;
  label: LangText;
  placeholder?: LangText;
  required: boolean;
  options?: LangText[];     // only for type 'select'
  enabled: boolean;
}

export interface InscriptionFormConfig {
  content: { ca: InscriptionContentBlock; es: InscriptionContentBlock; en: InscriptionContentBlock };
  fields: OptionalFieldConfig[];
  customQuestions: CustomQuestion[];
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
  async getConfig<T>(key: 'hero' | 'contact' | 'social' | 'about' | 'privacy' | 'cookies' | 'shop' | 'fees' | 'pricing' | 'branding' | 'analytics' | 'homepage' | 'menjador_info' | 'season' | 'inscription_form' | 'fee_rules' | 'book_prices'): Promise<T | null> {
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

  async updateConfig<T>(key: 'hero' | 'contact' | 'social' | 'about' | 'privacy' | 'cookies' | 'shop' | 'fees' | 'pricing' | 'branding' | 'analytics' | 'homepage' | 'menjador_info' | 'season' | 'inscription_form' | 'fee_rules' | 'book_prices', config: T): Promise<void> {
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

  async getMenjadorInfoConfig(): Promise<MenjadorInfoConfig | null> {
    return this.getConfig<MenjadorInfoConfig>('menjador_info');
  },

  async updateMenjadorInfoConfig(config: MenjadorInfoConfig): Promise<void> {
    return this.updateConfig('menjador_info', config);
  },

  async getSeasonConfig(): Promise<SeasonConfig | null> {
    return this.getConfig<SeasonConfig>('season');
  },

  async getInscriptionFormConfig(): Promise<InscriptionFormConfig | null> {
    return this.getConfig<InscriptionFormConfig>('inscription_form');
  },

  async updateInscriptionFormConfig(config: InscriptionFormConfig): Promise<void> {
    // Upsert keeps it resilient on DBs predating the seed migration.
    const { error } = await supabase
      .from('site_config')
      .upsert({ key: 'inscription_form', value: config, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
    try { localStorage.removeItem(CONFIG_CACHE_PREFIX + 'inscription_form'); } catch { /* ignore */ }
  },

  async updateSeasonConfig(config: SeasonConfig): Promise<void> {
    // Row is seeded by migration, but upsert keeps it resilient on older DBs.
    const { error } = await supabase
      .from('site_config')
      .upsert({ key: 'season', value: config, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
    try { localStorage.removeItem(CONFIG_CACHE_PREFIX + 'season'); } catch { /* ignore */ }
  },

  async getBookPricesConfig(): Promise<BookPricesConfig | null> {
    return this.getConfig<BookPricesConfig>('book_prices');
  },

  async updateBookPricesConfig(config: BookPricesConfig): Promise<void> {
    const { error } = await supabase
      .from('site_config')
      .upsert({ key: 'book_prices', value: config, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
    try { localStorage.removeItem(CONFIG_CACHE_PREFIX + 'book_prices'); } catch { /* ignore */ }
  },

  async getFeeRulesConfig(): Promise<FeeRulesConfig | null> {
    return this.getConfig<FeeRulesConfig>('fee_rules');
  },

  async updateFeeRulesConfig(config: FeeRulesConfig): Promise<void> {
    const { error } = await supabase
      .from('site_config')
      .upsert({ key: 'fee_rules', value: config, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
    try { localStorage.removeItem(CONFIG_CACHE_PREFIX + 'fee_rules'); } catch { /* ignore */ }
  },

  async upsertMenjadorInfoConfig(config: MenjadorInfoConfig): Promise<void> {
    // Site_config row may not exist in older databases — use upsert by key.
    const { error } = await supabase
      .from('site_config')
      .upsert({ key: 'menjador_info', value: config, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
    try { localStorage.removeItem(CONFIG_CACHE_PREFIX + 'menjador_info'); } catch { /* ignore */ }
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
