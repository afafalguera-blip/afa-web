import { X, Calendar, ExternalLink, Quote } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  image_url: string | null;
  sources?: string | null;
  news_url?: string | null;
  event_date?: string | null;
  created_at: string;
  translations?: Record<string, { title: string; excerpt: string; content: string }>;
}

interface NewsDetailModalProps {
  article: NewsArticle | null;
  isOpen: boolean;
  onClose: () => void;
}

export function NewsDetailModal({ article, isOpen, onClose }: NewsDetailModalProps) {
  const { t, i18n } = useTranslation();

  if (!isOpen || !article) return null;

  const currentLang = i18n.language;
  const title = article.translations?.[currentLang]?.title || article.title;
  const content = article.translations?.[currentLang]?.content || article.content;
  const excerpt = article.translations?.[currentLang]?.excerpt || article.excerpt;

  const eventDate = article.event_date ? new Date(article.event_date) : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-slate-800 w-full max-w-3xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image Header */}
        <div className="relative h-64 sm:h-80 shrink-0">
          <img
            src={article.image_url || 'https://images.unsplash.com/photo-1504711432869-5d39a110fdd7?q=80&w=2070&auto=format&fit=crop'}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-800 via-transparent to-black/20" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(article.created_at).toLocaleDateString(i18n.language, { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </span>
              {article.sources && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300">
                  <Quote className="w-3 h-3" />
                  {article.sources}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
              {title}
            </h2>

            {eventDate && (
              <div className="bg-primary/5 dark:bg-primary/10 border-2 border-primary/20 rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="w-16 h-16 bg-primary rounded-2xl flex flex-col items-center justify-center text-white shrink-0 shadow-lg shadow-primary/30">
                  <span className="text-[10px] font-bold uppercase tracking-tighter opacity-80">
                    {eventDate.toLocaleDateString(i18n.language, { month: 'short' })}
                  </span>
                  <span className="text-2xl font-black leading-none">
                    {eventDate.getDate()}
                  </span>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="font-bold text-primary text-sm uppercase tracking-widest mb-1">
                    {t('admin.news.field_event_date')}
                  </h4>
                  <p className="text-xl font-black text-slate-800 dark:text-white">
                    {eventDate.toLocaleDateString(i18n.language, { weekday: 'long' })}, {eventDate.getHours()}:{eventDate.getMinutes().toString().padStart(2, '0')}h
                  </p>
                </div>
              </div>
            )}

            {excerpt && (
              <p className="text-lg font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic border-l-4 border-primary pl-4">
                {excerpt}
              </p>
            )}
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-slate-600 dark:text-slate-300 leading-loose text-base sm:text-lg">
              {content}
            </div>
          </div>

          {article.news_url && (
            <div className="pt-6 mt-8 border-t border-slate-100 dark:border-slate-700">
              <a
                href={article.news_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                {t('common.read_more_external') || 'Llegir notícia original'}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
