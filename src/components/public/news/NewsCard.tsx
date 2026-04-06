import { Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { NewsArticle } from '../../../services/PublicNewsService';
import { proxyStorageUrl } from '../../../utils/storageUrl';

interface NewsCardProps {
    article: NewsArticle;
}

export function NewsCard({ article }: NewsCardProps) {
    const { i18n, t } = useTranslation();

    return (
        <Link
            to={`/noticies/${article.slug}`}
            className="group bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-slate-700 flex flex-col h-full"
        >
            <div className="relative h-56 overflow-hidden">
                <img
                    src={proxyStorageUrl(article.image_url) || 'https://images.unsplash.com/photo-1504711432869-5d39a110fdd7?q=80&w=2070&auto=format&fit=crop'}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(article.published_at || article.created_at).toLocaleDateString(i18n.language, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    })}
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                    {article.title}
                </h3>

                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6 line-clamp-3">
                    {article.excerpt}
                </p>

                <div className="mt-auto">
                    <div className="flex items-center gap-2 text-sm font-black text-primary group/btn">
                        {t('common.read_more')}
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
