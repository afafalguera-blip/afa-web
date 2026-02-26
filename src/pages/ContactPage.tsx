import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Clock, Send, CheckCircle2, AlertCircle, Instagram } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ContactService } from '../services/ContactService';
import { ConfigService, type ContactConfig, type SocialConfig } from '../services/ConfigService';

export function ContactPage() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const [contact, setContact] = useState<ContactConfig | null>(null);
    const [social, setSocial] = useState<SocialConfig | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: searchParams.get('subject') || '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const subjectParam = searchParams.get('subject');
        if (subjectParam) {
            setFormData(prev => ({ ...prev, subject: subjectParam }));
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchConfig = async () => {
            const [contactData, socialData] = await Promise.all([
                ConfigService.getContactConfig(),
                ConfigService.getSocialConfig()
            ]);
            setContact(contactData);
            setSocial(socialData);
        };
        fetchConfig();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await ContactService.submitMessage(formData);
            setIsSubmitted(true);
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (err) {
            console.error('Error submitting contact form:', err);
            setError('Hi ha hagut un error en enviar el missatge. Si us plau, torna-ho a intentar.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="text-center mb-8 md:mb-12">
                <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 md:mb-4">
                    {t('contact_page.title')}
                </h1>
                <p className="hidden md:block text-lg text-slate-600 dark:text-slate-400">
                    {t('contact_page.subtitle')}
                </p>
            </div>

            <div className="flex flex-col gap-8 md:gap-12">
                {/* Info Section - Now first on mobile */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-3xl p-6 md:p-8 border border-amber-100 dark:border-amber-900/20">
                        <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                                <Clock size={20} className="md:w-6 md:h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-tight">
                                    {t('contact_page.schedule_title')}
                                </h3>
                                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                                    {contact?.schedule || t('contact_page.schedule_mon')}
                                </p>
                            </div>
                        </div>

                        <div className="p-3 md:p-4 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-amber-100 dark:border-amber-900/10 flex items-start gap-3">
                            <Mail className="text-primary mt-1 shrink-0" size={16} />
                            <p className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300">
                                {contact?.schedule_info || t('contact_page.email_demand')}
                            </p>
                        </div>

                        {/* Appointment notice */}
                        <div className="mt-3 p-3 bg-amber-100/50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-900/30 flex items-start gap-3">
                            <AlertCircle className="text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" size={14} />
                            <p className="text-[11px] md:text-xs font-medium text-amber-700 dark:text-amber-400 leading-tight">
                                {t('contact_page.schedule_appointment_mobile')}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-800">
                        <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-sm md:text-base">{t('contact_page.other_ways' as any) || "Altres vies"}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
                            <a
                                href={`mailto:${contact?.email || 'ampafalguera@hotmail.es'}`}
                                className="flex items-center gap-3 text-primary hover:underline font-medium text-sm md:text-base"
                            >
                                <Mail size={16} />
                                <span className="truncate">{contact?.email || 'ampafalguera@hotmail.es'}</span>
                            </a>
                            {social?.instagram && (
                                <a
                                    href={social.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-pink-600 hover:underline font-medium text-sm md:text-base"
                                >
                                    <Instagram className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                                    {social.instagram.split('/').pop()?.startsWith('@') ? social.instagram.split('/').pop() : `@${social.instagram.split('/').pop()}`}
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Form Section */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700">
                    {/* ... error display ... */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3 border border-red-100 dark:border-red-900/20">
                            <AlertCircle size={20} />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {isSubmitted ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-8 md:py-12">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-4 md:mb-6">
                                <CheckCircle2 size={24} className="md:w-8 md:h-8" />
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-2">
                                {t('contact_page.form_success')}
                            </h3>
                            <button
                                onClick={() => setIsSubmitted(false)}
                                className="mt-4 md:mt-6 text-primary font-semibold hover:underline"
                            >
                                Enviar un altre missatge
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                                        {t('contact_page.form_name')}
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 md:py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                                        placeholder={t('contact_page.form_name_placeholder' as any) || "El teu nom"}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                                        {t('contact_page.form_email')}
                                    </label>
                                    <input
                                        required
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 md:py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                                        placeholder="email@example.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                                    {t('contact_page.form_subject')}
                                </label>
                                <input
                                    required
                                    type="text"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 md:py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                                    placeholder={t('contact_page.form_subject_placeholder' as any) || "Assumpte"}
                                />
                            </div>
                            <div>
                                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                                    {t('contact_page.form_message')}
                                </label>
                                <textarea
                                    required
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-4 py-2.5 md:py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none text-sm"
                                    placeholder={t('contact_page.form_message_placeholder' as any) || "Com et podem ajudar?"}
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
                                        {t('contact_page.form_submit')}
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
