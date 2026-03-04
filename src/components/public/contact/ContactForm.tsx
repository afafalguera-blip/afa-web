import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';

interface ContactFormProps {
    formData: {
        name: string;
        email: string;
        subject: string;
        message: string;
    };
    isSubmitting: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
}

export function ContactForm({ formData, isSubmitting, onChange, onSubmit }: ContactFormProps) {
    const { t } = useTranslation();

    return (
        <form onSubmit={onSubmit} className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                        {t('contact_page.form_name', 'Nom')}
                    </label>
                    <input
                        required
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={onChange}
                        className="w-full px-4 py-2.5 md:py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                        placeholder={t('contact_page.form_name_placeholder', 'El teu nom')}
                    />
                </div>
                <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                        {t('contact_page.form_email', 'Email')}
                    </label>
                    <input
                        required
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={onChange}
                        className="w-full px-4 py-2.5 md:py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                        placeholder="email@example.com"
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                    {t('contact_page.form_subject', 'Assumpte')}
                </label>
                <input
                    required
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={onChange}
                    className="w-full px-4 py-2.5 md:py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                    placeholder={t('contact_page.form_subject_placeholder', 'En què et podem ajudar?')}
                />
            </div>
            <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                    {t('contact_page.form_message', 'Missatge')}
                </label>
                <textarea
                    required
                    name="message"
                    value={formData.message}
                    onChange={onChange}
                    rows={4}
                    className="w-full px-4 py-2.5 md:py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none text-sm"
                    placeholder={t('contact_page.form_message_placeholder', 'Escriu el teu missatge aquí...')}
                />
            </div>
            <button
                disabled={isSubmitting}
                type="submit"
                className="w-full bg-primary text-white font-bold py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 text-sm md:text-base"
            >
                {isSubmitting ? (
                    <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <>
                        <Send size={16} className="md:w-[18px] md:h-[18px]" />
                        {t('contact_page.form_submit', 'Enviar missatge')}
                    </>
                )}
            </button>
        </form>
    );
}
