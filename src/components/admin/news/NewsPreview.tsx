import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';

interface NewsPreviewProps {
  activeLang: string;
  title: string;
  excerpt: string;
  previewHtml: string;
}

export function NewsPreview({ activeLang, title, excerpt, previewHtml }: NewsPreviewProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-neutral-200 p-5 bg-neutral-50">
      <div className="flex items-center gap-2 mb-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        <Eye className="w-4 h-4" aria-hidden="true" />
        {t('admin.news.show_preview', 'Vista prèvia')} ({activeLang})
      </div>
      <article className="prose prose-slate max-w-none bg-white rounded-md p-6 border border-neutral-200">
        <h1>{title || t('admin.news.title_placeholder')}</h1>
        <p className="lead">{excerpt || t('admin.news.excerpt_placeholder')}</p>
        <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </article>
    </div>
  );
}
