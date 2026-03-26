import { LayoutDashboard } from "lucide-react";
import type { HomepageConfig } from "../../../services/ConfigService";

interface HomepageSettingsProps {
    homepage: HomepageConfig;
    setHomepage: (homepage: HomepageConfig) => void;
}

export function HomepageSettings({ homepage, setHomepage }: HomepageSettingsProps) {
    const fields: { key: keyof HomepageConfig; label: string; description: string; min: number; max: number }[] = [
        { key: 'featured_news_count', label: 'Notícies Destacades', description: "Nombre de notícies a la pàgina d'inici", min: 1, max: 12 },
        { key: 'featured_events_count', label: 'Esdeveniments Destacats', description: "Nombre d'esdeveniments propers a mostrar", min: 1, max: 12 },
        { key: 'featured_projects_count', label: 'Projectes Destacats', description: "Nombre de projectes a la pàgina d'inici", min: 1, max: 12 },
        { key: 'max_students_per_inscription', label: "Màx. Alumnes per Inscripció", description: "Nombre màxim d'alumnes per formulari d'inscripció", min: 1, max: 10 },
        { key: 'calendar_events_per_day', label: 'Events per Dia (Calendari)', description: "Nombre màxim d'events visibles per casella del calendari", min: 1, max: 10 },
    ];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="border-b border-slate-50 dark:border-slate-700 pb-4">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <LayoutDashboard size={20} className="text-primary" />
                    Pàgina d'Inici
                </h3>
                <p className="text-xs text-slate-500 mt-1">Configura quants elements es mostren a cada secció de la home.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fields.map(({ key, label, description, min, max }) => (
                    <div key={key} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
                        <div>
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</label>
                            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
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

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
                <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">URL Acta Assemblea (PDF)</label>
                    <p className="text-xs text-slate-400 mt-0.5">Enllaç al PDF de l'acta d'assemblea que es mostra a la home.</p>
                </div>
                <input
                    type="url"
                    value={homepage.assemblea_pdf_url || ''}
                    onChange={(e) => setHomepage({ ...homepage, assemblea_pdf_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
            </div>
        </div>
    );
}
