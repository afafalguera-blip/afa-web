import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Calendar } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { PublicNewsService, type NewsArticle } from '../services/PublicNewsService';
import { NewsDetailHeader } from '../components/public/news/NewsDetailHeader';
import { NewsHeroImage } from '../components/public/news/NewsHeroImage';
import { NewsEventCard } from '../components/public/news/NewsEventCard';
import { NewsActions } from '../components/public/news/NewsActions';
import { sanitizeRichTextHtml } from '../utils/htmlSanitizer';
import { getReadabilityMetrics } from '../utils/readability';

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { i18n, t } = useTranslation();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;

      setLoading(true);
      const data = await PublicNewsService.getNewsBySlug(slug, i18n.language);
      setArticle(data);
      setLoading(false);
    };

    fetchArticle();
    window.scrollTo(0, 0);
  }, [slug, i18n.language]);

  const safeHtml = useMemo(() => sanitizeRichTextHtml(article?.content || ''), [article?.content]);
  const readability = useMemo(() => getReadabilityMetrics(article?.content || ''), [article?.content]);

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

        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          {t('news_detail.not_found', 'Notícia no trobada')}
        </h2>

        <Link to="/noticies" className="mt-4 text-primary font-bold flex items-center gap-2">
          <ChevronLeft size={20} /> {t('news_detail.back_to_news', 'Tornar a Notícies')}
        </Link>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={article.title}
        description={article.excerpt}
        ogImage={article.image_url || undefined}
        ogType="article"
      />

      <div className="pt-24 pb-20 min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
        <NewsDetailHeader
          title={article.title}
          excerpt={article.excerpt}
          createdAt={article.published_at || article.created_at}
          language={i18n.language}
          readingMinutes={readability.minutes}
        />

        <NewsHeroImage imageUrl={article.image_url} title={article.title} sources={article.sources} />

        <div className="max-w-3xl mx-auto px-4 sm:px-8 overflow-hidden">
          <NewsEventCard eventDate={article.event_date || null} language={i18n.language} />

          <div
            className="prose prose-slate dark:prose-invert max-w-none
              prose-p:text-lg prose-p:leading-relaxed prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:mb-6
              prose-headings:font-black prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:mt-10 prose-headings:mb-4
              prose-a:text-primary prose-a:font-bold prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-[2rem] sm:prose-img:rounded-[3rem] prose-img:shadow-xl
              prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-slate-50 dark:prose-blockquote:bg-slate-800/50 prose-blockquote:p-6 sm:prose-blockquote:p-10 prose-blockquote:rounded-r-[2rem] prose-blockquote:italic prose-blockquote:text-xl sm:prose-blockquote:text-2xl"
          >
            <div className="break-words overflow-hidden" dangerouslySetInnerHTML={{ __html: safeHtml }} />
          </div>

          <NewsActions
            title={article.title}
            newsUrl={article.news_url}
            attachmentUrl={article.attachment_url}
            attachmentName={article.attachment_name}
          />
        </div>
      </div>
    </>
  );
}
