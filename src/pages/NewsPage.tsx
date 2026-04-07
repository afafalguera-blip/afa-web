import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Newspaper } from 'lucide-react';
import { PublicNewsService, type NewsArticle } from '../services/PublicNewsService';
import { NewsListHeader } from '../components/public/news/NewsListHeader';
import { NewsCard } from '../components/public/news/NewsCard';
import { MAINTENANCE_MODE } from '../utils/maintenance';
import { MaintenancePlaceholder } from '../components/public/MaintenancePlaceholder';

export function NewsPage() {
  const { t, i18n } = useTranslation();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNews = useMemo(() => async () => {
    if (MAINTENANCE_MODE) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await PublicNewsService.getAllNews(i18n.language);
      setNews(data);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    fetchNews();
    window.scrollTo(0, 0);
  }, [fetchNews]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <NewsListHeader />

        {/* Loading State */}
        {MAINTENANCE_MODE ? (
          <MaintenancePlaceholder />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-500 font-medium">{t('common.loading')}</p>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <Newspaper className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-xl font-bold text-slate-400">
              {t('admin.news.no_articles')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
            {news.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
