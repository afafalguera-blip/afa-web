import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Clock, Send, CheckCircle2 } from 'lucide-react';

export function ContactPage() {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsSubmitting(false);
        setIsSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                    {t('contact_page.title')}
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                    {t('contact_page.subtitle')}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Form Section */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700">
                    {isSubmitted ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-12">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                {t('contact_page.form_success')}
                            </h3>
                            <button
                                onClick={() => setIsSubmitted(false)}
                                className="mt-6 text-primary font-semibold hover:underline"
                            >
                                Enviar un altre missatge
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    {t('contact_page.form_name')}
                                </label>
                                <input
                                    required
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    placeholder={t('contact_page.form_name_placeholder' as any) || "El teu nom"}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    {t('contact_page.form_email')}
                                </label>
                                <input
                                    required
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    {t('contact_page.form_subject')}
                                </label>
                                <input
                                    required
                                    type="text"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    placeholder={t('contact_page.form_subject_placeholder' as any) || "Assumpte"}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    {t('contact_page.form_message')}
                                </label>
                                <textarea
                                    required
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                                    placeholder={t('contact_page.form_message_placeholder' as any) || "Com et podem ajudar?"}
                                />
                            </div>
                            <button
                                disabled={isSubmitting}
                                type="submit"
                                className="w-full bg-primary text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        {t('contact_page.form_submit')}
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>

                {/* Info Section */}
                <div className="space-y-8">
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-3xl p-8 border border-amber-100 dark:border-amber-900/20">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-2xl flex items-center justify-center">
                                <Clock size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {t('contact_page.schedule_title')}
                            </h3>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            {t('contact_page.schedule_description')}
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                                {t('contact_page.schedule_tue')}
                            </div>
                        </div>
                        <div className="mt-8 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-amber-900/10 flex items-start gap-3">
                            <Mail className="text-primary mt-1 shrink-0" size={18} />
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {t('contact_page.email_demand')}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-8 border border-slate-100 dark:border-slate-800">
                        <h4 className="font-bold text-slate-900 dark:text-white mb-4">{t('contact_page.other_ways' as any) || "Altres vies"}</h4>
                        <div className="space-y-4">
                            <a
                                href="mailto:ampafalguera@hotmail.es"
                                className="flex items-center gap-3 text-primary hover:underline font-medium"
                            >
                                <Mail size={18} />
                                ampafalguera@hotmail.es
                            </a>
                            <a
                                href="https://instagram.com/afafalguera"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 text-pink-600 hover:underline font-medium"
                            >
                                <span className="material-icons-round text-[18px]">instagram</span>
                                @afafalguera
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
