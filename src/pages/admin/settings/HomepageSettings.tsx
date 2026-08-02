import { useRef, useState } from "react";
import { LayoutDashboard, Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import type { HomepageConfig, HeroConfig } from "../../../services/ConfigService";
import { ConfigService } from "../../../services/ConfigService";
import { useToast } from "../../../components/common/Toast";
import { useSettingsT } from "./useSettingsT";

interface HomepageSettingsProps {
    homepage: HomepageConfig;
    setHomepage: (homepage: HomepageConfig) => void;
    hero: HeroConfig | null;
    setHero: (hero: HeroConfig) => void;
}

function HeroSection({ hero, setHero }: { hero: HeroConfig | null; setHero: (hero: HeroConfig) => void }) {
    const t = useSettingsT();
    const { toast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const current: HeroConfig = hero ?? { image_url: '', title: '' };

    const handleUpload = async (file: File) => {
        setUploading(true);
        try {
            const url = await ConfigService.uploadHeroImage(file);
            setHero({ ...current, image_url: url });
        } catch (err) {
            console.error('Upload error:', err);
            toast.error(t('admin.settings.homepage.upload_error', 'Error al pujar la imatge'));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-4">
            <div>
                <label className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                    <ImageIcon size={16} className="text-neutral-500" />
                    {t('admin.settings.homepage.hero_title', 'Hero de la portada')}
                </label>
                <p className="text-xs text-neutral-400 mt-0.5">
                    {t('admin.settings.homepage.hero_subtitle', "Imatge principal i títol de benvinguda de la pàgina d'inici.")}
                </p>
            </div>

            <div className="relative group rounded-xl overflow-hidden aspect-[21/9] bg-neutral-100 border-2 border-dashed border-neutral-200">
                {current.image_url ? (
                    <img src={current.image_url} className="w-full h-full object-cover" alt={t('admin.settings.homepage.hero_preview_alt', 'Vista prèvia del hero')} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                        <Upload size={28} className="mb-2" />
                        <span className="text-xs">{t('admin.settings.homepage.no_image', 'Sense imatge')}</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        className="bg-white text-neutral-900 px-4 py-2 rounded-lg font-medium text-sm cursor-pointer shadow-lg hover:bg-neutral-100 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        {t('admin.settings.homepage.change_image', 'Canviar imatge')}
                    </button>
                </div>
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
            </div>
            <p className="text-[10px] text-neutral-500 italic">
                {t('admin.settings.homepage.hero_hint', 'Recomanat: 1920x600px o similar format panoràmic.')}
            </p>

            <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500">
                    {t('admin.settings.homepage.welcome_title', 'Títol de benvinguda')}
                </label>
                <input
                    type="text"
                    value={current.title}
                    onChange={(e) => setHero({ ...current, title: e.target.value })}
                    placeholder={t('admin.settings.homepage.welcome_placeholder', "Ex: Benvinguts a l'AFA Falguera")}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm focus:ring-2 focus:ring-neutral-300 focus:border-neutral-300"
                />
            </div>
        </div>
    );
}

interface CountField {
    key: keyof HomepageConfig;
    labelKey: string;
    labelDefault: string;
    descKey: string;
    descDefault: string;
    min: number;
    max: number;
}

const COUNT_FIELDS: CountField[] = [
    { key: 'featured_news_count', labelKey: 'admin.settings.homepage.news_count', labelDefault: 'Notícies destacades', descKey: 'admin.settings.homepage.news_count_desc', descDefault: "Nombre de notícies a la pàgina d'inici", min: 1, max: 12 },
    { key: 'featured_events_count', labelKey: 'admin.settings.homepage.events_count', labelDefault: 'Esdeveniments destacats', descKey: 'admin.settings.homepage.events_count_desc', descDefault: "Nombre d'esdeveniments propers a mostrar", min: 1, max: 12 },
    { key: 'featured_projects_count', labelKey: 'admin.settings.homepage.projects_count', labelDefault: 'Projectes destacats', descKey: 'admin.settings.homepage.projects_count_desc', descDefault: "Nombre de projectes a la pàgina d'inici", min: 1, max: 12 },
    { key: 'max_students_per_inscription', labelKey: 'admin.settings.homepage.max_students', labelDefault: 'Màx. alumnes per inscripció', descKey: 'admin.settings.homepage.max_students_desc', descDefault: "Nombre màxim d'alumnes per formulari d'inscripció", min: 1, max: 10 },
    { key: 'calendar_events_per_day', labelKey: 'admin.settings.homepage.events_per_day', labelDefault: 'Events per dia (calendari)', descKey: 'admin.settings.homepage.events_per_day_desc', descDefault: "Nombre màxim d'events visibles per casella del calendari", min: 1, max: 10 }
];

export function HomepageSettings({ homepage, setHomepage, hero, setHero }: HomepageSettingsProps) {
    const t = useSettingsT();

    return (
        <div className="bg-white rounded-xl p-6 border border-neutral-200 space-y-6">
            <div className="border-b border-neutral-100 pb-4">
                <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                    <LayoutDashboard size={18} className="text-neutral-700" />
                    {t('admin.settings.homepage.title', "Pàgina d'inici")}
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                    {t('admin.settings.homepage.subtitle', 'Configura quants elements es mostren a cada secció de la home.')}
                </p>
            </div>

            <HeroSection hero={hero} setHero={setHero} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {COUNT_FIELDS.map(({ key, labelKey, labelDefault, descKey, descDefault, min, max }) => (
                    <div key={key} className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3">
                        <div>
                            <label htmlFor={`homepage-${key}`} className="text-sm font-bold text-neutral-700">
                                {t(labelKey, labelDefault)}
                            </label>
                            <p className="text-xs text-neutral-400 mt-0.5">{t(descKey, descDefault)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                id={`homepage-${key}`}
                                type="range"
                                min={min}
                                max={max}
                                value={homepage[key]}
                                onChange={(e) => setHomepage({ ...homepage, [key]: Number(e.target.value) })}
                                className="flex-1 accent-neutral-900"
                            />
                            <span className="text-lg font-bold text-neutral-900 w-8 text-center">{homepage[key]}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3">
                <div>
                    <label htmlFor="homepage-assemblea-pdf" className="text-sm font-bold text-neutral-700">
                        {t('admin.settings.homepage.assemblea_pdf', 'URL acta assemblea (PDF)')}
                    </label>
                    <p className="text-xs text-neutral-400 mt-0.5">
                        {t('admin.settings.homepage.assemblea_pdf_desc', "Enllaç al PDF de l'acta d'assemblea que es mostra a la home.")}
                    </p>
                </div>
                <input
                    id="homepage-assemblea-pdf"
                    type="url"
                    value={homepage.assemblea_pdf_url || ''}
                    onChange={(e) => setHomepage({ ...homepage, assemblea_pdf_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm focus:ring-2 focus:ring-neutral-300 focus:border-neutral-300"
                />
            </div>
        </div>
    );
}
