import { Instagram, Twitter, Facebook } from "lucide-react";
import type { SocialConfig } from "../../../services/ConfigService";

interface SocialSettingsProps {
    social: SocialConfig;
    setSocial: (social: SocialConfig) => void;
}

export function SocialSettings({ social, setSocial }: SocialSettingsProps) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-50 dark:border-slate-700 pb-4">
                Xarxes Socials
            </h3>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Instagram</label>
                    <div className="relative">
                        <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500" size={18} />
                        <input
                            type="url"
                            value={social.instagram}
                            onChange={(e) => setSocial({ ...social, instagram: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all"
                            placeholder="https://instagram.com/..."
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Twitter / X (Opcional)</label>
                    <div className="relative">
                        <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-500" size={18} />
                        <input
                            type="url"
                            value={social.twitter}
                            onChange={(e) => setSocial({ ...social, twitter: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all"
                            placeholder="https://twitter.com/..."
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Facebook (Opcional)</label>
                    <div className="relative">
                        <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={18} />
                        <input
                            type="url"
                            value={social.facebook}
                            onChange={(e) => setSocial({ ...social, facebook: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all"
                            placeholder="https://facebook.com/..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
