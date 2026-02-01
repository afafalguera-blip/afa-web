import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Edit } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FeaturedProjects } from '../components/public/FeaturedProjects';
import { NewsDetailModal } from '../components/public/NewsDetailModal';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  image_url: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  news_url?: string | null;
  sources?: string | null;
  event_date?: string | null;
  translations?: Record<string, { title: string; excerpt: string; content: string }>;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  all_day: boolean;
  color: string | null;
  event_type: string | null;
}


export function Home() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchNews();
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(8);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoadingNews(false);
    }
  };

  const handleOpenDetail = (article: NewsArticle) => {
    setSelectedArticle(article);
    setIsDetailModalOpen(true);
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
          <Link to="/noticies" className="text-sm font-semibold text-primary">{t('home.see_all')}</Link>
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
                onClick={() => handleOpenDetail(item)}
                className="min-w-[85%] lg:min-w-0 snap-center bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-md border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-all group relative cursor-pointer"
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
                  {item.event_date && (
                    <div className="absolute top-3 right-3 bg-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-lg flex items-center gap-1.5 animate-pulse">
                      <span className="material-icons-round text-xs">event</span>
                      {new Date(item.event_date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg leading-tight mb-2 text-slate-900 dark:text-white line-clamp-2">
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
                      {item.news_url && (
                        <a 
                          href={item.news_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Llegir més
                          <span className="material-icons-round text-xs">open_in_new</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="px-6 mt-8 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('home.events_title')}</h2>
          <Link to="/calendari" className="text-sm font-semibold text-primary">{t('home.see_all')}</Link>
        </div>
        
        <div className="space-y-4">
          {loadingEvents ? (
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl animate-pulse">
              <div className="w-14 h-14 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 uppercase text-[10px] tracking-widest font-bold">
              {t('common.no_events' as any) || "No hi ha propers esdeveniments"}
            </div>
          ) : (
            events.map((event) => {
              const date = new Date(event.event_date);
              const day = date.getDate();
              const month = date.toLocaleDateString(i18n.language, { month: 'short' });
              
              return (
                <div key={event.id} className="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow group">
                  <div 
                    className="w-14 h-14 flex flex-col items-center justify-center rounded-xl text-secondary dark:text-primary transition-colors"
                    style={{ backgroundColor: event.color ? `${event.color}15` : 'rgba(var(--color-primary), 0.1)' }}
                  >
                    <span className="text-[10px] font-bold uppercase">{month}</span>
                    <span className="text-xl font-bold">{day}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">{event.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {event.start_time ? event.start_time.slice(0, 5) : ''}
                      {event.start_time && event.location ? ' · ' : ''}
                      {event.location}
                    </p>
                  </div>
                  <button className="p-2 text-slate-300 hover:text-slate-500 transition group-hover:bg-slate-100 dark:group-hover:bg-slate-700 rounded-full">
                    <span className="material-icons-round text-lg">chevron_right</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      <NewsDetailModal 
        article={selectedArticle}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />

      <FeaturedProjects />



      <section className="px-6 mt-4 mb-12">
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
    </>
  );
}
