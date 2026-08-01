import { BarChart3 } from "lucide-react";
import type { AnalyticsConfig } from "../../../services/ConfigService";
import { useSettingsT } from "./useSettingsT";

interface AnalyticsSettingsProps {
    analytics: AnalyticsConfig;
    setAnalytics: (analytics: AnalyticsConfig) => void;
}

export function AnalyticsSettings({ analytics, setAnalytics }: AnalyticsSettingsProps) {
    const t = useSettingsT();

    return (
        <div className="bg-white rounded-xl p-6 border border-neutral-200 space-y-6">
            <div className="border-b border-neutral-100 pb-4">
                <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                    <BarChart3 size={18} className="text-neutral-700" />
                    {t('admin.settings.analytics.title', 'Analytics')}
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                    {t('admin.settings.analytics.subtitle', "Configura Google Analytics i altres serveis d'analítica.")}
                </p>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                    <div>
                        <span className="text-sm font-bold text-neutral-700">Google Analytics</span>
                        <p className="text-xs text-neutral-400 mt-0.5">
                            {t('admin.settings.analytics.toggle_desc', 'Activa o desactiva el rastreig de Google Analytics a tot el lloc.')}
                        </p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={analytics.enabled}
                        aria-label={t('admin.settings.analytics.toggle_label', 'Activar Google Analytics')}
                        onClick={() => setAnalytics({ ...analytics, enabled: !analytics.enabled })}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${analytics.enabled ? 'bg-neutral-900' : 'bg-neutral-300'}`}
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${analytics.enabled ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                    </button>
                </div>

                <div className="space-y-1">
                    <label htmlFor="analytics-measurement-id" className="text-xs font-bold text-neutral-500">
                        {t('admin.settings.analytics.measurement_id', 'Measurement ID')}
                    </label>
                    <input
                        id="analytics-measurement-id"
                        type="text"
                        value={analytics.google_analytics_id}
                        onChange={(e) => setAnalytics({ ...analytics, google_analytics_id: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm font-mono"
                        placeholder="G-XXXXXXXXXX"
                        disabled={!analytics.enabled}
                    />
                    <p className="text-xs text-neutral-400 mt-1">
                        {t('admin.settings.analytics.measurement_hint', 'El trobaràs a Google Analytics → Administració → Flux de dades.')}
                    </p>
                </div>
            </div>
        </div>
    );
}
