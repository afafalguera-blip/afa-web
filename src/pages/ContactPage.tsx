import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ContactService } from '../services/ContactService';
import { ConfigService, type ContactConfig, type SocialConfig } from '../services/ConfigService';
import { ContactInfo } from '../components/public/contact/ContactInfo';
import { ContactForm } from '../components/public/contact/ContactForm';
import { ContactSuccess } from '../components/public/contact/ContactSuccess';

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
            try {
                const [contactData, socialData] = await Promise.all([
                    ConfigService.getContactConfig(),
                    ConfigService.getSocialConfig()
                ]);
                setContact(contactData);
                setSocial(socialData);
            } catch (err) {
                console.error('Error fetching contact configuration:', err);
            }
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
            setError(t('contact_page.form_error', 'Hi ha hagut un error en enviar el missatge. Si us plau, torna-ho a intentar.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-12 animate-in fade-in duration-700">
            <div className="text-center mb-8 md:mb-12">
                <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 md:mb-4">
                    {t('contact_page.title', 'Contacta amb l\'AFA')}
                </h1>
                <p className="hidden md:block text-lg text-slate-600 dark:text-slate-400">
                    {t('contact_page.subtitle', 'Estem aquí per ajudar-te. Envia\'ns els teus dubtes o suggeriments.')}
                </p>
            </div>

            <div className="flex flex-col gap-8 md:gap-12">
                {/* Info Section */}
                <ContactInfo contact={contact} social={social} />

                {/* Form Section */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3 border border-red-100 dark:border-red-900/20">
                            <AlertCircle size={20} />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {isSubmitted ? (
                        <ContactSuccess onReset={() => setIsSubmitted(false)} />
                    ) : (
                        <ContactForm
                            formData={formData}
                            isSubmitting={isSubmitting}
                            onChange={handleChange}
                            onSubmit={handleSubmit}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
