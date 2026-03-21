import { useState } from 'react';
import { Share2, Quote, Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NewsActionsProps {
  title: string;
  newsUrl?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

export function NewsActions({ title, newsUrl, attachmentUrl, attachmentName }: NewsActionsProps) {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState<string | null>(null);

  const shareCurrentNews = async () => {
    const currentUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title, url: currentUrl });
        return;
      }

      await navigator.clipboard.writeText(currentUrl);
      setFeedback(t('common.share', 'Compartir') + ': OK');
      window.setTimeout(() => setFeedback(null), 2000);
    } catch (error) {
      console.error('Error sharing news:', error);
      setFeedback(t('common.error_generic'));
      window.setTimeout(() => setFeedback(null), 2000);
    }
  };

  const copyQuote = async () => {
    const quote = `"${title}" - ${window.location.href}`;

    try {
      await navigator.clipboard.writeText(quote);
      setFeedback(t('common.quote', 'Citeu') + ': OK');
      window.setTimeout(() => setFeedback(null), 2000);
    } catch (error) {
      console.error('Error copying quote:', error);
      setFeedback(t('common.error_generic'));
      window.setTimeout(() => setFeedback(null), 2000);
    }
  };

  return (
    <div className="mt-24 pt-12 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-10">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={shareCurrentNews}
            className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
          >
            <Share2 className="w-4 h-4" />
            {t('common.share', 'Compartir')}
          </button>

          <button
            type="button"
            onClick={copyQuote}
            className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
          >
            <Quote className="w-4 h-4" />
            {t('common.quote', 'Citeu')}
          </button>
        </div>

        {feedback && <span className="text-xs text-slate-400">{feedback}</span>}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {attachmentUrl && (
          <a
            href={attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-full font-black text-[10px] uppercase tracking-[0.16em] hover:translate-y-[-3px] hover:shadow-xl hover:shadow-blue-200 transition-all active:scale-95"
            download={attachmentName || undefined}
          >
            <Paperclip className="w-4 h-4" />
            {t('news_detail.download_pdf', 'Descarregar PDF')}
          </a>
        )}

        {newsUrl && (
          <a
            href={newsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-black text-[10px] uppercase tracking-[0.2em] hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-primary/20 transition-all active:scale-95"
          >
            {t('news_detail.read_original', 'Llegir notícia original')}
          </a>
        )}
      </div>
    </div>
  );
}
