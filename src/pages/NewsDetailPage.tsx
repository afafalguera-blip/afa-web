import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { Calendar, Quote, ChevronLeft, Clock, Share2, MapPin } from 'lucide-react';
import { SEO } from '../components/common/SEO';

interface NewsArticle {
    id: string;
    slug: string;
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

export default function NewsDetailPage() {
    const { slug } = useParams<{ slug: string }>();
    const { i18n } = useTranslation();
    const [article, setArticle] = useState<NewsArticle | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (slug) {
            fetchArticle();
        }
        window.scrollTo(0, 0);
    }, [slug]);

    const fetchArticle = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('news')
                .select('*')
                .eq('slug', slug)
                .single();

            if (error) throw error;
            setArticle(data);
        } catch (error) {
            console.error('Error fetching article:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center pt-24">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!article) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center pt-24 px-4 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <Calendar className="w-10 h-10 text-slate-300" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Notícia no trobada</h2>
                <Link to="/noticies" className="mt-4 text-primary font-bold flex items-center gap-2">
                    <ChevronLeft size={20} /> Tornar a Notícies
                </Link>
            </div>
        );
    }

    const currentLang = i18n.language;
    // Fallback: si no hay traducción en el idioma actual, usamos la base (habitualmente ES o CA)
    const contentData = article.translations?.[currentLang] || {
        title: article.title,
        excerpt: article.excerpt,
        content: article.content
    };

    const title = contentData.title;
    const content = contentData.content;
    const excerpt = contentData.excerpt;
    const eventDate = article.event_date ? new Date(article.event_date) : null;

    return (
        <>
            <SEO
                title={title}
                description={excerpt}
                ogImage={article.image_url || undefined}
                ogType="article"
            />

            <div className="pt-24 pb-20 min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
                {/* Header Minimalista */}
                <div className="max-w-3xl mx-auto px-4 sm:px-8 mb-12 overflow-hidden">
                    <Link
                        to="/noticies"
                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-colors mb-10 group"
                    >
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Notícies
                    </Link>

                    <div className="space-y-8">
                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            <span className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-white/5">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                {new Date(article.created_at).toLocaleDateString(currentLang, {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </span>
                            <span className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                3 min de lectura
                            </span>
                        </div>

                        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight break-words">
                            {title}
                        </h1>

                        {excerpt && (
                            <p className="text-lg sm:text-xl lg:text-2xl font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl border-l-2 border-slate-100 dark:border-white/10 pl-4 sm:pl-6 break-words">
                                {excerpt}
                            </p>
                        )}

                        <div className="flex items-center gap-4 pt-6">
                            <div className="flex -space-x-3 shrink-0">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-4 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm">
                                        AFA
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-black text-slate-900 dark:text-white truncate">Junta del AFA</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Escola Falguera</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Imagen destacada */}
                <div className="max-w-5xl mx-auto px-0 sm:px-8 mb-16 overflow-hidden">
                    <div className="relative aspect-[21/9] sm:aspect-[16/7] sm:rounded-[3rem] overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img
                            src={article.image_url || 'https://images.unsplash.com/photo-1504711432869-5d39a110fdd7?q=80&w=2070&auto=format&fit=crop'}
                            alt={title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    {article.sources && (
                        <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-4 italic">
                            Font: {article.sources}
                        </p>
                    )}
                </div>

                {/* Área de Contenido */}
                <div className="max-w-3xl mx-auto px-4 sm:px-8 overflow-hidden">
                    {eventDate && (
                        <div className="mb-12 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-10 shadow-sm">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center text-white shrink-0 shadow-xl shadow-primary/20">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                                    {eventDate.toLocaleDateString(currentLang, { month: 'short' })}
                                </span>
                                <span className="text-3xl sm:text-4xl font-black leading-none">
                                    {eventDate.getDate()}
                                </span>
                            </div>
                            <div className="flex-1 text-center sm:text-left space-y-1 sm:space-y-2 min-w-0">
                                <div className="flex items-center justify-center sm:justify-start gap-2 text-primary">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <h4 className="font-black text-[10px] uppercase tracking-[0.2em]">
                                        Esdeveniment
                                    </h4>
                                </div>
                                <p className="text-xl sm:text-3xl font-black text-slate-800 dark:text-white leading-tight break-words">
                                    {eventDate.toLocaleDateString(currentLang, { weekday: 'long' })}, {eventDate.getHours()}:{eventDate.getMinutes().toString().padStart(2, '0')}h
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="prose prose-slate dark:prose-invert max-w-none 
                        prose-p:text-lg prose-p:leading-relaxed prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:mb-6
                        prose-headings:font-black prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:mt-10 prose-headings:mb-4
                        prose-a:text-primary prose-a:font-bold prose-a:no-underline hover:prose-a:underline
                        prose-img:rounded-[2rem] sm:prose-img:rounded-[3rem] prose-img:shadow-xl
                        prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-slate-50 dark:prose-blockquote:bg-slate-800/50 prose-blockquote:p-6 sm:prose-blockquote:p-10 prose-blockquote:rounded-r-[2rem] prose-blockquote:italic prose-blockquote:text-xl sm:prose-blockquote:text-2xl
                    ">
                        <div
                            className="break-words overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    </div>

                    {/* Footer Social / Acciones */}
                    <div className="mt-24 pt-12 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-10">
                        <div className="flex items-center gap-8">
                            <button className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">
                                <Share2 className="w-4 h-4" />
                                Compartir
                            </button>
                            <button className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">
                                <Quote className="w-4 h-4" />
                                Citeu
                            </button>
                        </div>

                        {article.news_url && (
                            <a
                                href={article.news_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-3 px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-black text-[10px] uppercase tracking-[0.2em] hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-primary/20 transition-all active:scale-95"
                            >
                                Llegir notícia original
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
