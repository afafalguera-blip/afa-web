import { Instagram, Twitter, Facebook } from "lucide-react";
import type { SocialConfig } from "../../../services/ConfigService";
import { useSettingsT } from "./useSettingsT";

interface SocialSettingsProps {
    social: SocialConfig;
    setSocial: (social: SocialConfig) => void;
}

const INPUT_CLASS =
    "w-full pl-12 pr-4 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-neutral-300 outline-none transition-all";

export function SocialSettings({ social, setSocial }: SocialSettingsProps) {
    const t = useSettingsT();

    return (
        <div className="bg-white rounded-xl p-6 border border-neutral-200 space-y-6">
            <h3 className="text-lg font-bold text-neutral-900 border-b border-neutral-100 pb-4">
                {t('admin.settings.social.title', 'Xarxes socials')}
            </h3>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label htmlFor="social-instagram" className="block text-sm font-bold text-neutral-700">Instagram</label>
                    <div className="relative">
                        <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500" size={18} aria-hidden="true" />
                        <input
                            id="social-instagram"
                            type="url"
                            value={social.instagram}
                            onChange={(e) => setSocial({ ...social, instagram: e.target.value })}
                            className={INPUT_CLASS}
                            placeholder="https://instagram.com/..."
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="social-twitter" className="block text-sm font-bold text-neutral-700">
                        {t('admin.settings.social.twitter', 'Twitter / X (opcional)')}
                    </label>
                    <div className="relative">
                        <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-500" size={18} aria-hidden="true" />
                        <input
                            id="social-twitter"
                            type="url"
                            value={social.twitter}
                            onChange={(e) => setSocial({ ...social, twitter: e.target.value })}
                            className={INPUT_CLASS}
                            placeholder="https://twitter.com/..."
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="social-facebook" className="block text-sm font-bold text-neutral-700">
                        {t('admin.settings.social.facebook', 'Facebook (opcional)')}
                    </label>
                    <div className="relative">
                        <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={18} aria-hidden="true" />
                        <input
                            id="social-facebook"
                            type="url"
                            value={social.facebook}
                            onChange={(e) => setSocial({ ...social, facebook: e.target.value })}
                            className={INPUT_CLASS}
                            placeholder="https://facebook.com/..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
