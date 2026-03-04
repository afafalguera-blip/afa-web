import { Mail, Phone, MapPin, Clock } from "lucide-react";
import type { ContactConfig } from "../../../services/ConfigService";

interface ContactSettingsProps {
    contact: ContactConfig;
    setContact: (contact: ContactConfig) => void;
}

export function ContactSettings({ contact, setContact }: ContactSettingsProps) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-50 dark:border-slate-700 pb-4">
                Dades de Contacte Principal
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Email Oficial</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="email"
                            value={contact.email}
                            onChange={(e) => setContact({ ...contact, email: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Telèfon (Opcional)</label>
                    <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={contact.phone}
                            onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all"
                            placeholder="Ex: 933 00 00 00"
                        />
                    </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Direcció Física</label>
                    <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={contact.address}
                            onChange={(e) => setContact({ ...contact, address: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Horari d'Atenció</label>
                    <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={contact.schedule}
                            onChange={(e) => setContact({ ...contact, schedule: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Informació adicional horari / localització</label>
                    <textarea
                        value={contact.schedule_info}
                        onChange={(e) => setContact({ ...contact, schedule_info: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all"
                    />
                </div>
            </div>
        </div>
    );
}
