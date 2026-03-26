import { useRef, useState } from "react";
import { Globe, Palette, Upload, Loader2 } from "lucide-react";
import type { BrandingConfig } from "../../../services/ConfigService";
import { ConfigService } from "../../../services/ConfigService";

interface BrandingSettingsProps {
    branding: BrandingConfig;
    setBranding: (branding: BrandingConfig) => void;
    activeLang: 'ca' | 'es' | 'en';
    setActiveLang: (lang: 'ca' | 'es' | 'en') => void;
}

function ImageUploadField({ label, value, onChange, prefix }: {
    label: string;
    value: string;
    onChange: (url: string) => void;
    prefix: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (file: File) => {
        setUploading(true);
        try {
            const url = await ConfigService.uploadBrandingImage(file, prefix);
            onChange(url);
        } catch (err) {
            console.error('Upload error:', err);
            alert('Error al pujar la imatge');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500">{label}</label>
            <div className="flex gap-2">
                <input
                    type="url"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-mono text-xs"
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
                    className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    Pujar
                </button>
            </div>
            {value && (
                <div className="mt-1 w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white">
                    <img src={value} alt="Preview" className="w-full h-full object-contain p-1" />
                </div>
            )}
        </div>
    );
}

export function BrandingSettings({ branding, setBranding, activeLang, setActiveLang }: BrandingSettingsProps) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 dark:border-slate-700 pb-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Palette size={20} className="text-primary" />
                        Marca i SEO
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Nom del lloc, logo, imatges per defecte i descripció SEO.</p>
                </div>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-fit">
                    {(['ca', 'es', 'en'] as const).map((lang) => (
                        <button
                            key={lang}
                            type="button"
                            onClick={() => setActiveLang(lang)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeLang === lang
                                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            {lang.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Nom del Lloc</label>
                    <input
                        type="text"
                        value={branding.site_name}
                        onChange={(e) => setBranding({ ...branding, site_name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm"
                        placeholder="AFA Escola Falguera"
                    />
                </div>

                <ImageUploadField
                    label="Logo"
                    value={branding.logo_url}
                    onChange={(url) => setBranding({ ...branding, logo_url: url })}
                    prefix="logo"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ImageUploadField
                        label="Imatge Hero per Defecte"
                        value={branding.default_hero_url}
                        onChange={(url) => setBranding({ ...branding, default_hero_url: url })}
                        prefix="hero"
                    />
                    <ImageUploadField
                        label="Imatge Placeholder per Defecte"
                        value={branding.default_placeholder_url}
                        onChange={(url) => setBranding({ ...branding, default_placeholder_url: url })}
                        prefix="placeholder"
                    />
                </div>

                <hr className="border-slate-100 dark:border-slate-700" />

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/20">
                        <Globe size={18} />
                        <p className="text-xs font-medium">Editant descripció SEO en <span className="font-bold underline">{activeLang === 'ca' ? 'Català' : activeLang === 'es' ? 'Castellà' : 'Anglès'}</span></p>
                    </div>
                    <label className="text-xs font-bold text-slate-500">Descripció SEO per Defecte</label>
                    <textarea
                        value={branding.default_seo_description[activeLang]}
                        onChange={(e) => setBranding({
                            ...branding,
                            default_seo_description: { ...branding.default_seo_description, [activeLang]: e.target.value }
                        })}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm leading-relaxed"
                        placeholder="Descripció del lloc per als motors de cerca..."
                    />
                </div>
            </div>
        </div>
    );
}
