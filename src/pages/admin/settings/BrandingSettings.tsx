import { useRef, useState } from "react";
import { Globe, Palette, Upload, Loader2 } from "lucide-react";
import type { BrandingConfig } from "../../../services/ConfigService";
import { ConfigService } from "../../../services/ConfigService";
import { useToast } from "../../../components/common/Toast";
import { useSettingsT } from "./useSettingsT";

interface BrandingSettingsProps {
    branding: BrandingConfig;
    setBranding: (branding: BrandingConfig) => void;
    activeLang: 'ca' | 'es' | 'en';
    setActiveLang: (lang: 'ca' | 'es' | 'en') => void;
}

const LANG_NAMES: Record<'ca' | 'es' | 'en', { key: string; fallback: string }> = {
    ca: { key: 'admin.settings.lang.ca', fallback: 'Català' },
    es: { key: 'admin.settings.lang.es', fallback: 'Castellà' },
    en: { key: 'admin.settings.lang.en', fallback: 'Anglès' }
};

function ImageUploadField({ label, value, onChange, prefix }: {
    label: string;
    value: string;
    onChange: (url: string) => void;
    prefix: string;
}) {
    const t = useSettingsT();
    const { toast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (file: File) => {
        setUploading(true);
        try {
            const url = await ConfigService.uploadBrandingImage(file, prefix);
            onChange(url);
        } catch (err) {
            console.error('Upload error:', err);
            toast.error(t('admin.settings.branding.upload_error', 'Error al pujar la imatge'));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500">{label}</label>
            <div className="flex gap-2">
                <input
                    type="url"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 font-mono text-xs"
                    placeholder="https://..."
                />
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                        e.target.value = '';
                    }}
                />
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2 bg-admin-accent hover:bg-admin-accent-hover text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {t('admin.settings.branding.upload', 'Pujar')}
                </button>
            </div>
            {value && (
                <div className="mt-1 w-16 h-16 rounded-lg border border-neutral-200 overflow-hidden bg-white">
                    <img src={value} alt={t('admin.settings.branding.preview_alt', 'Vista prèvia')} className="w-full h-full object-contain p-1" />
                </div>
            )}
        </div>
    );
}

export function BrandingSettings({ branding, setBranding, activeLang, setActiveLang }: BrandingSettingsProps) {
    const t = useSettingsT();
    const langName = t(LANG_NAMES[activeLang].key, LANG_NAMES[activeLang].fallback);

    return (
        <div className="bg-white rounded-xl p-6 border border-neutral-200 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                <div>
                    <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                        <Palette size={18} className="text-neutral-700" />
                        {t('admin.settings.branding.title', 'Marca i SEO')}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">
                        {t('admin.settings.branding.subtitle', 'Nom del lloc, logo, imatges per defecte i descripció SEO.')}
                    </p>
                </div>
                <div className="flex p-1 bg-neutral-100 rounded-lg w-fit">
                    {(['ca', 'es', 'en'] as const).map((lang) => (
                        <button
                            key={lang}
                            type="button"
                            onClick={() => setActiveLang(lang)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeLang === lang
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-400 hover:text-neutral-600'
                                }`}
                        >
                            {lang.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500">
                        {t('admin.settings.branding.site_name', 'Nom del lloc')}
                    </label>
                    <input
                        type="text"
                        value={branding.site_name}
                        onChange={(e) => setBranding({ ...branding, site_name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm"
                        placeholder="AFA Escola Falguera"
                    />
                </div>

                <ImageUploadField
                    label={t('admin.settings.branding.logo', 'Logo')}
                    value={branding.logo_url}
                    onChange={(url) => setBranding({ ...branding, logo_url: url })}
                    prefix="logo"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ImageUploadField
                        label={t('admin.settings.branding.default_hero', 'Imatge hero per defecte')}
                        value={branding.default_hero_url}
                        onChange={(url) => setBranding({ ...branding, default_hero_url: url })}
                        prefix="hero"
                    />
                    <ImageUploadField
                        label={t('admin.settings.branding.default_placeholder', 'Imatge placeholder per defecte')}
                        value={branding.default_placeholder_url}
                        onChange={(url) => setBranding({ ...branding, default_placeholder_url: url })}
                        prefix="placeholder"
                    />
                </div>

                <hr className="border-neutral-100" />

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                        <Globe size={18} aria-hidden="true" />
                        <p className="text-xs font-medium">
                            {t('admin.settings.branding.editing_seo_in', 'Editant descripció SEO en')}{' '}
                            <span className="font-bold underline">{langName}</span>
                        </p>
                    </div>
                    <label className="text-xs font-bold text-neutral-500">
                        {t('admin.settings.branding.seo_description', 'Descripció SEO per defecte')}
                    </label>
                    <textarea
                        value={branding.default_seo_description[activeLang]}
                        onChange={(e) => setBranding({
                            ...branding,
                            default_seo_description: { ...branding.default_seo_description, [activeLang]: e.target.value }
                        })}
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm leading-relaxed"
                        placeholder={t('admin.settings.branding.seo_placeholder', 'Descripció del lloc per als motors de cerca...')}
                    />
                </div>
            </div>
        </div>
    );
}
