import { Mail, Phone, MapPin, Clock } from "lucide-react";
import type { ContactConfig } from "../../../services/ConfigService";
import { useSettingsT } from "./useSettingsT";

interface ContactSettingsProps {
    contact: ContactConfig;
    setContact: (contact: ContactConfig) => void;
}

const INPUT_CLASS =
    "w-full pl-12 pr-4 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-neutral-300 outline-none transition-all";

export function ContactSettings({ contact, setContact }: ContactSettingsProps) {
    const t = useSettingsT();

    return (
        <div className="bg-white rounded-xl p-6 border border-neutral-200 space-y-6">
            <h3 className="text-lg font-bold text-neutral-900 border-b border-neutral-100 pb-4">
                {t('admin.settings.contact.title', 'Dades de contacte principal')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="contact-email" className="block text-sm font-bold text-neutral-700">
                        {t('admin.settings.contact.email', 'Email oficial')}
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} aria-hidden="true" />
                        <input
                            id="contact-email"
                            type="email"
                            value={contact.email}
                            onChange={(e) => setContact({ ...contact, email: e.target.value })}
                            className={INPUT_CLASS}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="contact-phone" className="block text-sm font-bold text-neutral-700">
                        {t('admin.settings.contact.phone', 'Telèfon (opcional)')}
                    </label>
                    <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} aria-hidden="true" />
                        <input
                            id="contact-phone"
                            type="text"
                            value={contact.phone}
                            onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                            className={INPUT_CLASS}
                            placeholder="Ex: 933 00 00 00"
                        />
                    </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                    <label htmlFor="contact-address" className="block text-sm font-bold text-neutral-700">
                        {t('admin.settings.contact.address', 'Adreça física')}
                    </label>
                    <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} aria-hidden="true" />
                        <input
                            id="contact-address"
                            type="text"
                            value={contact.address}
                            onChange={(e) => setContact({ ...contact, address: e.target.value })}
                            className={INPUT_CLASS}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="contact-schedule" className="block text-sm font-bold text-neutral-700">
                        {t('admin.settings.contact.schedule', "Horari d'atenció")}
                    </label>
                    <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} aria-hidden="true" />
                        <input
                            id="contact-schedule"
                            type="text"
                            value={contact.schedule}
                            onChange={(e) => setContact({ ...contact, schedule: e.target.value })}
                            className={INPUT_CLASS}
                        />
                    </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                    <label htmlFor="contact-schedule-info" className="block text-sm font-bold text-neutral-700">
                        {t('admin.settings.contact.schedule_info', 'Informació addicional (horari / localització)')}
                    </label>
                    <textarea
                        id="contact-schedule-info"
                        value={contact.schedule_info}
                        onChange={(e) => setContact({ ...contact, schedule_info: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-neutral-300 outline-none transition-all"
                    />
                </div>
            </div>
        </div>
    );
}
