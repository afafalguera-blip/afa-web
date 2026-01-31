import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Calendar, ArrowRight, Newspaper } from 'lucide-react';
import { NewsDetailModal } from '../components/public/NewsDetailModal';

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  image_url: string | null;
  sources?: string | null;
  news_url?: string | null;
  event_date?: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  translations?: Record<string, { title: string; excerpt: string; content: string }>;
}

export function NewsPage() {
  const { t, i18n } = useTranslation();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  useEffect(() => {
    fetchNews();
    window.scrollTo(0, 0);
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4">
            {t('home.news_title')}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t('home.news_archive.subtitle') || 'Mantén-te al dia de tot el que passa a la nostra escola i dels projectes de l\'AFA.'}
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-500 font-medium">{t('common.loading') || 'Carregant...'}</p>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <Newspaper className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-xl font-bold text-slate-400">
              {t('admin.news.no_articles')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {news.map((article) => {
              const currentLang = i18n.language;
              const title = article.translations?.[currentLang]?.title || article.title;
              const excerpt = article.translations?.[currentLang]?.excerpt || article.excerpt;
              
              return (
                <div 
                  key={article.id}
                  className="group bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-slate-700 flex flex-col h-full"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={article.image_url || 'https://images.unsplash.com/photo-1504711432869-5d39a110fdd7?q=80&w=2070&auto=format&fit=crop'}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-3">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(article.created_at).toLocaleDateString(i18n.language, { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                      {title}
                    </h3>
                    
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6 line-clamp-3">
                      {excerpt}
                    </p>
                    
                    <div className="mt-auto">
                      <button
                        onClick={() => setSelectedArticle(article)}
                        className="flex items-center gap-2 text-sm font-black text-primary group/btn"
                      >
                        {t('common.read_more') || 'Llegir més'}
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <NewsDetailModal
        article={selectedArticle}
        isOpen={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </div>
  );
}
