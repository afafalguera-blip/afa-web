import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Edit } from 'lucide-react';
import { NewsService, type NewsArticle } from '../services/NewsService';
import { LazyImage } from '../../../components/common/LazyImage';
import { useHomepageConfig } from '../../../hooks/useHomepageConfig';
import { MAINTENANCE_MODE } from '../../../utils/maintenance';
import { MaintenancePlaceholder } from '../../../components/public/MaintenancePlaceholder';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1504711432869-5d39a110fdd7?q=80&w=2070&auto=format&fit=crop';

interface NewsSectionProps {
    isAdmin: boolean;
}

/**
 * Portada de noticias: una destacada y el resto en fila compacta.
 *
 * Antes eran tres tarjetas iguales en un carrusel horizontal. En el movil cada
 * una ocupaba el 85% del ancho, la segunda asomaba cortada por el borde y para
 * ver la tercera habia que arrastrar sin que nada lo indicara. Con una destacada
 * y dos lineas debajo se ven las tres de golpe, y se lee cual es la importante.
 */
export const NewsSection: React.FC<NewsSectionProps> = ({ isAdmin }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const homepageConfig = useHomepageConfig();
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (MAINTENANCE_MODE) {
            setLoading(false);
            return;
        }
        const fetchNews = async () => {
            try {
                const data = await NewsService.getLatestNews(homepageConfig.featured_news_count);
                setNews(data);
            } catch (error) {
                console.error('Error fetching news:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, []);

    const title = (item: NewsArticle) => item.translations?.[i18n.language]?.title || item.title;
    const excerpt = (item: NewsArticle) => item.translations?.[i18n.language]?.excerpt || item.excerpt;

    const shortDate = (item: NewsArticle) => {
        const raw = item.event_date || item.published_at || item.created_at;
        if (!raw) return null;
        return new Date(raw).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
    };

    const [featured, ...rest] = news;

    return (
        <section className="mt-2 lg:mt-8 px-6">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('home.news_title')}</h2>
                <Link to="/noticies" className="text-sm font-semibold text-primary">{t('home.see_all')}</Link>
            </div>

            {loading ? (
                <div className="space-y-3">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl h-56 animate-pulse" />
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl h-16 animate-pulse" />
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl h-16 animate-pulse" />
                </div>
            ) : MAINTENANCE_MODE ? (
                <MaintenancePlaceholder compact />
            ) : news.length === 0 ? (
                <div className="py-12 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    {t('common.no_news')}
                </div>
            ) : (
                <div className="lg:grid lg:grid-cols-3 lg:gap-4 lg:items-start">
                    <Link
                        to={`/noticies/${featured.slug}`}
                        className="block lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative"
                    >
                        {isAdmin && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigate('/admin/news');
                                }}
                                aria-label={t('common.edit')}
                                title={t('common.edit')}
                                className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center bg-white/85 dark:bg-slate-900/85 rounded-full shadow-md backdrop-blur-sm border border-white/30 hover:scale-110 active:scale-95 transition-all"
                            >
                                <Edit size={16} className="text-primary" />
                            </button>
                        )}

                        <div className="h-44 lg:h-64 bg-slate-200 overflow-hidden">
                            <LazyImage
                                alt={title(featured)}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                src={featured.image_url || PLACEHOLDER}
                            />
                        </div>

                        <div className="p-4">
                            <h3 className="font-bold text-lg leading-tight text-slate-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors">
                                {title(featured)}
                            </h3>
                            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                                {excerpt(featured)}
                            </p>
                            <p className="mt-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {[shortDate(featured), featured.sources].filter(Boolean).join(' · ')}
                            </p>
                        </div>
                    </Link>

                    {rest.length > 0 && (
                        <ul className="mt-3 lg:mt-0 space-y-2">
                            {rest.map((item) => (
                                <li key={item.id}>
                                    <Link
                                        to={`/noticies/${item.slug}`}
                                        className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-2.5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all group"
                                    >
                                        <div className="w-14 h-14 shrink-0 rounded-[12px] overflow-hidden bg-slate-200">
                                            <LazyImage
                                                alt={title(item)}
                                                className="w-full h-full object-cover"
                                                src={item.image_url || PLACEHOLDER}
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                                {title(item)}
                                            </h3>
                                            {shortDate(item) && (
                                                <p className="mt-0.5 text-xs text-slate-400">{shortDate(item)}</p>
                                            )}
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </section>
    );
};
