import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Edit } from 'lucide-react';
import { NewsService, type NewsArticle } from '../services/NewsService';
import { LazyImage } from '../../../components/common/LazyImage';

interface NewsSectionProps {
    isAdmin: boolean;
}

export const NewsSection: React.FC<NewsSectionProps> = ({ isAdmin }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const data = await NewsService.getLatestNews(3);
                setNews(data);
            } catch (error) {
                console.error('Error fetching news:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, []);

    return (
        <section className="mt-4 lg:mt-8">
            <div className="px-6 flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('home.news_title')}</h2>
                <Link to="/noticies" className="text-sm font-semibold text-primary">{t('home.see_all')}</Link>
            </div>

            <div className="flex overflow-x-auto px-6 gap-4 hide-scrollbar snap-x pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="min-w-[85%] lg:min-w-0 bg-slate-100 dark:bg-slate-800 rounded-3xl h-64 animate-pulse"></div>
                    ))
                ) : news.length === 0 ? (
                    <div className="col-span-3 py-12 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                        {t('common.no_news' as any)}
                    </div>
                ) : (
                    news.map((item) => (
                        <Link
                            key={item.id}
                            to={`/noticies/${item.slug}`}
                            className="min-w-[85%] lg:min-w-0 snap-center bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-md border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-all group relative cursor-pointer z-10"
                        >
                            {isAdmin && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        navigate('/admin/news');
                                    }}
                                    className="absolute top-3 right-3 z-20 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 scale-0 group-hover:scale-100 transition-transform flex items-center gap-1 text-xs px-3"
                                >
                                    <Edit size={14} />
                                    {t('common.edit')}
                                </button>
                            )}

                            <div className="h-40 bg-slate-200 relative overflow-hidden">
                                <LazyImage
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    src={item.image_url || 'https://images.unsplash.com/photo-1504711432869-5d39a110fdd7?q=80&w=2070&auto=format&fit=crop'}
                                />

                                {item.event_date && (
                                    <div className="absolute top-3 right-3 bg-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-lg flex items-center gap-1.5 animate-pulse">
                                        <span className="material-icons-round text-xs">event</span>
                                        {new Date(item.event_date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-lg leading-tight mb-2 text-slate-900 dark:text-white line-clamp-2 transition-colors group-hover:text-primary">
                                    {item.translations?.[i18n.language]?.title || item.title}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                                    {item.translations?.[i18n.language]?.excerpt || item.excerpt}
                                </p>
                                {(item.sources || item.news_url) && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[150px]">
                                            {item.sources || 'Font externa'}
                                        </span>
                                        <div className="text-xs font-bold text-primary flex items-center gap-1">
                                            Llegir més
                                            <span className="material-icons-round text-xs">arrow_forward</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </section>
    );
};
