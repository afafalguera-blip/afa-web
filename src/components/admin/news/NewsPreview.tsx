import { Eye } from 'lucide-react';

interface NewsPreviewProps {
  activeLang: string;
  title: string;
  excerpt: string;
  previewHtml: string;
}

export function NewsPreview({ activeLang, title, excerpt, previewHtml }: NewsPreviewProps) {
  return (
    <div className="rounded-3xl border border-neutral-200 p-6 bg-neutral-50/60">
      <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">
        <Eye className="w-4 h-4" />
        Vista previa ({activeLang})
      </div>
      <article className="prose prose-slate max-w-none bg-white rounded-lg p-6 border border-neutral-100">
        <h1>{title || 'Título de la noticia'}</h1>
        <p className="lead">{excerpt || 'Resumen de la noticia...'}</p>
        <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </article>
    </div>
  );
}
