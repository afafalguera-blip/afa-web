import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Edit } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FeaturedProjects } from '../components/public/FeaturedProjects';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  image_url: string | null;
  published: boolean;
  created_at: string;
}


export function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoadingNews(false);
    }
  };

  return (
    <>

      {/* Hero Section - Responsive */}
      <div className="w-full h-40 lg:h-[300px] mb-6 lg:mb-8 relative rounded-2xl lg:rounded-3xl overflow-hidden mt-4 lg:mt-6 shadow-lg lg:shadow-xl mx-auto max-w-[calc(100%-3rem)] lg:max-w-none">
        <img 
          src="https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/sign/Imagenes/hero_escuela.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NjM3Yjc4My1lYzY4LTRjMjMtYmMyNS04MTA2ODk5ZjhjMGIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJJbWFnZW5lcy9oZXJvX2VzY3VlbGEucG5nIiwiaWF0IjoxNzY5NTU0NjAxLCJleHAiOjMzMzA1NTU0NjAxfQ.fZrP8adLhMw8UjClDHTCdao7eDbB-2-8tgQBTlhpOwQ"
          alt="Escola Hero"
          className="w-full h-full object-cover bg-slate-200"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4 lg:p-8">
            <h1 className="hidden lg:block text-4xl font-bold text-white drop-shadow-md leading-tight">
                {t('home.welcome_title' as any) || "Benvinguts a l'AFA Falguera"}
            </h1>
        </div>
      </div>
      
      {/* Navigation: Mobile Grid | Desktop Floating Pill */}
      <section className="px-6 py-4 relative z-20 mb-6">
        {/* Mobile Grid */}
        <div className="grid grid-cols-3 gap-6 lg:hidden">
          <Link to="/extraescolars" className="flex flex-col items-center gap-1.5 group">
            <div className="w-14 h-14 flex items-center justify-center bg-primary rounded-2xl text-white shadow-lg shadow-primary/20 group-active:scale-95 transition-transform">
              <span className="material-icons-round text-2xl">sports_soccer</span>
            </div>
            <span className="text-[10px] font-bold text-slate-900 dark:text-slate-200 uppercase tracking-tight">{t('home.extraescolars')}</span>
          </Link>
          <Link to="/quotes" className="flex flex-col items-center gap-1.5 group">
            <div className="w-14 h-14 flex items-center justify-center bg-secondary rounded-2xl text-white shadow-lg shadow-secondary/20 group-active:scale-95 transition-transform">
              <span className="material-icons-round text-2xl">payments</span>
            </div>
            <span className="text-[10px] font-bold text-slate-900 dark:text-slate-200 uppercase tracking-tight">{t('home.fees')}</span>
          </Link>
          <Link to="/calendari" className="flex flex-col items-center gap-1.5 group">
            <div className="w-14 h-14 flex items-center justify-center bg-amber-500 rounded-2xl text-white shadow-lg shadow-amber-500/20 group-active:scale-95 transition-transform">
              <span className="material-icons-round text-2xl">calendar_today</span>
            </div>
            <span className="text-[10px] font-bold text-slate-900 dark:text-slate-200 uppercase tracking-tight">{t('home.calendar')}</span>
          </Link>
        </div>

        {/* Desktop Floating Pill Nav */}
        <div className="hidden lg:flex justify-center">
            <div className="bg-white dark:bg-slate-800 rounded-full shadow-xl shadow-slate-200/50 dark:shadow-black/50 p-2 flex items-center gap-2 border border-slate-100 dark:border-slate-700">
                <Link to="/extraescolars" className="flex items-center gap-3 px-6 py-3 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                        <span className="material-icons-round">sports_soccer</span>
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{t('home.extraescolars')}</span>
                </Link>

                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>

                <Link to="/quotes" className="flex items-center gap-3 px-6 py-3 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                    <div className="w-10 h-10 bg-secondary/10 text-secondary rounded-full flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-colors">
                        <span className="material-icons-round">payments</span>
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{t('home.fees')}</span>
                </Link>
                
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>

                <Link to="/calendari" className="flex items-center gap-3 px-6 py-3 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                    <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <span className="material-icons-round">calendar_today</span>
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{t('home.calendar')}</span>
                </Link>
            </div>
        </div>
      </section>

      <section className="mt-4 lg:mt-8">
        <div className="px-6 flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('home.news_title')}</h2>
          <button className="text-sm font-semibold text-primary">{t('home.see_all')}</button>
        </div>
        
        {/* Mobile: Horizontal Scroll | Desktop: Grid */}
        <div className="flex overflow-x-auto px-6 gap-4 hide-scrollbar snap-x pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
          {loadingNews ? (
             Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="min-w-[85%] lg:min-w-0 bg-slate-100 dark:bg-slate-800 rounded-3xl h-64 animate-pulse"></div>
             ))
          ) : news.length === 0 ? (
             <div className="col-span-3 py-12 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                {t('common.no_news' as any) || "No hi ha notícies actualment"}
             </div>
          ) : (
            news.map((item) => (
              <div 
                key={item.id}
                className="min-w-[85%] lg:min-w-0 snap-center bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-md border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-all group relative"
              >
                {isAdmin && (
                  <button
                    onClick={(e) => {
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
                  <img 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    src={item.image_url || 'https://images.unsplash.com/photo-1504711432869-5d39a110fdd7?q=80&w=2070&auto=format&fit=crop'}
                  />
                  <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Notícia
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg leading-tight mb-2 text-slate-900 dark:text-white line-clamp-2">{item.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{item.excerpt}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Featured Projects Section */}
      <FeaturedProjects />

      {/* New About Section */}
      <section className="px-6 mt-4">
         <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <button 
                onClick={() => setAboutExpanded(!aboutExpanded)}
                className="w-full flex items-center justify-between p-5 text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-primary">
                        <span className="material-icons-round">info</span>
                    </div>
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white">{t('home.about_title')}</h2>
                </div>
                {aboutExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
            </button>
            
            {aboutExpanded && (
                <div className="px-5 pb-5 text-sm text-slate-600 dark:text-slate-300 space-y-4 animate-in slide-in-from-top-2">
                    <p>{t('home.about_text_1')}</p>
                    <p>{t('home.about_text_2')}</p>
                    <p>{t('home.about_text_3')}</p>
                    
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                        <h4 className="font-semibold mb-2 text-primary">{t('home.about_functions_title')}</h4>
                        <ul className="list-disc pl-4 space-y-1 marker:text-primary">
                            {((t('home.about_functions', { returnObjects: true }) as any) || []).map((func: string, i: number) => (
                                <li key={i}>{func}</li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xs italic text-slate-500 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-900/20">
                        {t('home.about_contact')}
                    </p>
                </div>
            )}
         </div>
      </section>

      <section className="px-6 mt-4">
        <div className="bg-primary/10 dark:bg-primary/20 border border-primary/20 p-5 rounded-3xl flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white">
              <span className="material-icons-round">verified_user</span>
            </div>
            <div>
              <h4 className="font-bold text-secondary dark:text-primary">{t('home.member_status')}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">{t('home.member_active')}</p>
            </div>
          </div>
          <span className="material-icons-round text-slate-400">chevron_right</span>
        </div>
      </section>

      <section className="px-6 mt-8 mb-4">
        <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">{t('home.events_title')}</h2>
        {/* Events list using translations if we had keys, but title is static here for now */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="w-14 h-14 bg-accent dark:bg-slate-700 flex flex-col items-center justify-center rounded-xl text-secondary dark:text-primary">
              <span className="text-xs font-bold uppercase">Oct</span>
              <span className="text-xl font-bold">24</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Reunió de delegats</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">17:30h · Biblioteca</p>
            </div>
            <button className="p-2 text-slate-300 hover:text-slate-500 transition">
              <span className="material-icons-round">more_vert</span>
            </button>
          </div>
        </div>
      </section>

    </>
  );
}
