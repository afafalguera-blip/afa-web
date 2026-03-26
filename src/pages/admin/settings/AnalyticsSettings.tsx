import { BarChart3 } from "lucide-react";
import type { AnalyticsConfig } from "../../../services/ConfigService";

interface AnalyticsSettingsProps {
    analytics: AnalyticsConfig;
    setAnalytics: (analytics: AnalyticsConfig) => void;
}

export function AnalyticsSettings({ analytics, setAnalytics }: AnalyticsSettingsProps) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="border-b border-slate-50 dark:border-slate-700 pb-4">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <BarChart3 size={20} className="text-primary" />
                    Analytics
                </h3>
                <p className="text-xs text-slate-500 mt-1">Configura Google Analytics i altres serveis d'analítica.</p>
            </div>

            <div className="space-y-6">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div>
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Google Analytics</label>
                        <p className="text-xs text-slate-400 mt-0.5">Activa o desactiva el rastreig de Google Analytics a tot el lloc.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setAnalytics({ ...analytics, enabled: !analytics.enabled })}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${analytics.enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${analytics.enabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Measurement ID</label>
                    <input
                        type="text"
                        value={analytics.google_analytics_id}
                        onChange={(e) => setAnalytics({ ...analytics, google_analytics_id: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-mono"
                        placeholder="G-XXXXXXXXXX"
                        disabled={!analytics.enabled}
                    />
                    <p className="text-xs text-slate-400 mt-1">El trobaràs a Google Analytics → Administració → Flux de dades.</p>
                </div>
            </div>
        </div>
    );
}
