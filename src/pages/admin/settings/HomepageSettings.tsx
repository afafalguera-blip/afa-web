import { useRef, useState } from "react";
import { LayoutDashboard, Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import type { HomepageConfig, HeroConfig } from "../../../services/ConfigService";
import { ConfigService } from "../../../services/ConfigService";

interface HomepageSettingsProps {
    homepage: HomepageConfig;
    setHomepage: (homepage: HomepageConfig) => void;
    hero: HeroConfig | null;
    setHero: (hero: HeroConfig) => void;
}

function HeroSection({ hero, setHero }: { hero: HeroConfig | null; setHero: (hero: HeroConfig) => void }) {
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
            alert('Error al pujar la imatge');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-100 dark:border-neutral-700 space-y-4">
            <div>
                <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                    <ImageIcon size={16} className="text-primary" />
                    Hero de la Portada
                </label>
                <p className="text-xs text-neutral-400 mt-0.5">Imatge principal i títol de benvinguda de la pàgina d'inici.</p>
            </div>

            <div className="relative group rounded-xl overflow-hidden aspect-[21/9] bg-neutral-100 dark:bg-neutral-800 border-2 border-dashed border-neutral-200 dark:border-neutral-700">
                {current.image_url ? (
                    <img src={current.image_url} className="w-full h-full object-cover" alt="Hero preview" />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                        <Upload size={28} className="mb-2" />
                        <span className="text-xs">Sense imatge</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        className="bg-white text-neutral-900 px-4 py-2 rounded-xl font-bold text-sm cursor-pointer shadow-lg hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50"
                    >
                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        Canviar Imatge
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
            <p className="text-[10px] text-neutral-500 italic">Recomanat: 1920x600px o similar format panoràmic.</p>

            <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500">Títol de Benvinguda</label>
                <input
                    type="text"
                    value={current.title}
                    onChange={(e) => setHero({ ...current, title: e.target.value })}
                    placeholder="Ex: Benvinguts a l'AFA Falguera"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
            </div>
        </div>
    );
}

export function HomepageSettings({ homepage, setHomepage, hero, setHero }: HomepageSettingsProps) {
    const fields: { key: keyof HomepageConfig; label: string; description: string; min: number; max: number }[] = [
        { key: 'featured_news_count', label: 'Notícies Destacades', description: "Nombre de notícies a la pàgina d'inici", min: 1, max: 12 },
        { key: 'featured_events_count', label: 'Esdeveniments Destacats', description: "Nombre d'esdeveniments propers a mostrar", min: 1, max: 12 },
        { key: 'featured_projects_count', label: 'Projectes Destacats', description: "Nombre de projectes a la pàgina d'inici", min: 1, max: 12 },
        { key: 'max_students_per_inscription', label: "Màx. Alumnes per Inscripció", description: "Nombre màxim d'alumnes per formulari d'inscripció", min: 1, max: 10 },
        { key: 'calendar_events_per_day', label: 'Events per Dia (Calendari)', description: "Nombre màxim d'events visibles per casella del calendari", min: 1, max: 10 },
    ];

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-3xl p-8 shadow-sm border border-neutral-100 dark:border-neutral-700 space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="border-b border-neutral-50 dark:border-neutral-700 pb-4">
                <h3 className="text-xl font-bold text-neutral-800 dark:text-white flex items-center gap-2">
                    <LayoutDashboard size={20} className="text-primary" />
                    Pàgina d'Inici
                </h3>
                <p className="text-xs text-neutral-500 mt-1">Configura quants elements es mostren a cada secció de la home.</p>
            </div>

            <HeroSection hero={hero} setHero={setHero} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fields.map(({ key, label, description, min, max }) => (
                    <div key={key} className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-100 dark:border-neutral-700 space-y-3">
                        <div>
                            <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300">{label}</label>
                            <p className="text-xs text-neutral-400 mt-0.5">{description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min={min}
                                max={max}
                                value={homepage[key]}
                                onChange={(e) => setHomepage({ ...homepage, [key]: Number(e.target.value) })}
                                className="flex-1 accent-primary"
                            />
                            <span className="text-lg font-bold text-primary w-8 text-center">{homepage[key]}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-100 dark:border-neutral-700 space-y-3">
                <div>
                    <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300">URL Acta Assemblea (PDF)</label>
                    <p className="text-xs text-neutral-400 mt-0.5">Enllaç al PDF de l'acta d'assemblea que es mostra a la home.</p>
                </div>
                <input
                    type="url"
                    value={homepage.assemblea_pdf_url || ''}
                    onChange={(e) => setHomepage({ ...homepage, assemblea_pdf_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
            </div>
        </div>
    );
}
