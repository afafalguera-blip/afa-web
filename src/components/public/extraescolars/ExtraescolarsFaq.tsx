import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { FaqService, type Faq } from '../../../services/FaqService';
import { useContentTranslation } from '../../../hooks/useContentTranslation';

export function ExtraescolarsFaq() {
    const { t } = useTranslation();
    const { tContent } = useContentTranslation();
    const [faqs, setFaqs] = useState<Faq[]>([]);
    const [openKey, setOpenKey] = useState<string | null>(null);

    useEffect(() => {
        FaqService.getActive()
            .then(setFaqs)
            .catch(err => console.error('Error fetching faqs:', err));
    }, []);

    if (faqs.length === 0) return null;

    // Group by translated category, preserving sort order (first-seen wins).
    const groups: { category: string; items: Faq[] }[] = [];
    for (const faq of faqs) {
        const category = tContent(faq, 'category');
        let group = groups.find(g => g.category === category);
        if (!group) {
            group = { category, items: [] };
            groups.push(group);
        }
        group.items.push(faq);
    }

    return (
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-5 md:p-8 border border-slate-100 dark:border-white/5 shadow-sm relative z-10">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 text-primary p-2.5 rounded-2xl shrink-0">
                    <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl lg:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        {t('faq.title')}
                    </h2>
                    <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                        {t('faq.subtitle')}
                    </p>
                </div>
            </div>

            <div className="space-y-8">
                {groups.map((group, ci) => (
                    <div key={ci}>
                        {group.category && (
                            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
                                {group.category}
                            </h3>
                        )}
                        <div className="space-y-2">
                            {group.items.map((faq) => {
                                const isOpen = openKey === faq.id;
                                return (
                                    <div
                                        key={faq.id}
                                        className="rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden bg-slate-50/50 dark:bg-slate-900/30"
                                    >
                                        <button
                                            onClick={() => setOpenKey(isOpen ? null : faq.id)}
                                            className="w-full flex items-center justify-between gap-4 text-left px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-100 text-sm lg:text-base"
                                            aria-expanded={isOpen}
                                        >
                                            <span>{tContent(faq, 'question')}</span>
                                            <ChevronDown
                                                className={`w-5 h-5 shrink-0 text-primary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                                            />
                                        </button>
                                        <div
                                            className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                                        >
                                            <div className="overflow-hidden">
                                                <p className="px-4 pb-4 text-slate-500 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-line">
                                                    {tContent(faq, 'answer')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
