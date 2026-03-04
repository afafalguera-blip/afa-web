import { Share2, Quote } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NewsActionsProps {
    newsUrl?: string | null;
}

export function NewsActions({ newsUrl }: NewsActionsProps) {
    const { t } = useTranslation();

    return (
        <div className="mt-24 pt-12 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-8">
                <button className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">
                    <Share2 className="w-4 h-4" />
                    {t('common.share', 'Compartir')}
                </button>
                <button className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">
                    <Quote className="w-4 h-4" />
                    {t('common.quote', 'Citeu')}
                </button>
            </div>

            {newsUrl && (
                <a
                    href={newsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-black text-[10px] uppercase tracking-[0.2em] hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-primary/20 transition-all active:scale-95"
                >
                    {t('news_detail.read_original', 'Llegir notícia original')}
                </a>
            )}
        </div>
    );
}
