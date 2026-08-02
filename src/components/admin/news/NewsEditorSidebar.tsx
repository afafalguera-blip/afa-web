import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image as ImageIcon, Link as LinkIcon, Calendar as CalendarIcon,
  Info, FileText, Clock3, Wand2, Upload, Trash2, Loader2, Paperclip
} from 'lucide-react';
import { ImageUpload } from '../ImageUpload';
import { StorageService } from '../../../services/StorageService';
import { generateSlug, type NewsFormData } from '../../../services/admin/AdminNewsEditorService';
import { useToast } from '../../common/Toast';
import { ContentStatusBadge } from './ContentStatusBadge';

interface NewsEditorSidebarProps {
  formData: NewsFormData;
  setFormData: React.Dispatch<React.SetStateAction<NewsFormData>>;
  metrics: { words: number; minutes: number };
  lastAutosaveAt: string | null;
  nativeDateLocale: string;
}

export function NewsEditorSidebar({ formData, setFormData, metrics, lastAutosaveAt, nativeDateLocale }: NewsEditorSidebarProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|avif|svg)$/i.test(lowerName);
    if (!isPdf && !isImage) {
      toast.error(t('admin.news.attachment_type_error', 'Només s\'admeten arxius PDF o imatges'));
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('admin.news.attachment_size_error', 'L\'arxiu supera la mida màxima (10MB)'));
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
      return;
    }

    setUploadingAttachment(true);
    try {
      const folder = isPdf ? 'news/pdfs' : 'news/attachments';
      const uploadedUrl = await StorageService.uploadFile('activity-images', file, folder);
      setFormData((prev) => ({ ...prev, attachment_url: uploadedUrl, attachment_name: file.name }));
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast.error(t('common.error_save'));
    } finally {
      setUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  };

  const handleAttachmentRemove = () => {
    setFormData((prev) => ({ ...prev, attachment_url: '', attachment_name: '' }));
  };

  return (
    <div className="space-y-6">
      {/* Publish status & metrics */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <ContentStatusBadge visible={formData.published} hiddenKind="draft" />
          <label className="relative inline-flex items-center cursor-pointer">
            <span className="sr-only">{t('admin.status.action_publish', 'Publicar')}</span>
            <input
              type="checkbox"
              checked={formData.published}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  published: event.target.checked,
                  published_at: event.target.checked ? prev.published_at || new Date().toISOString() : null
                }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-200 peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-900" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-neutral-50 p-4 border border-neutral-200">
            <div className="flex items-center gap-2 text-neutral-500 text-[11px] font-semibold uppercase tracking-wide mb-1">
              <FileText className="w-3.5 h-3.5" /> {t('admin.news.metric_words', 'Paraules')}
            </div>
            <div className="text-2xl font-bold text-neutral-900">{metrics.words}</div>
          </div>
          <div className="rounded-md bg-neutral-50 p-4 border border-neutral-200">
            <div className="flex items-center gap-2 text-neutral-500 text-[11px] font-semibold uppercase tracking-wide mb-1">
              <Clock3 className="w-3.5 h-3.5" /> {t('admin.news.metric_reading', 'Lectura')}
            </div>
            <div className="text-2xl font-bold text-neutral-900">{metrics.minutes} min</div>
          </div>
        </div>

        <div className="rounded-md bg-neutral-50 px-4 py-3 border border-neutral-200 text-xs text-neutral-500 flex items-center gap-2">
          <Wand2 className="w-4 h-4" />
          {lastAutosaveAt
            ? t('admin.news.autosaved_at', 'Desat automàticament: {{time}}', { time: new Date(lastAutosaveAt).toLocaleTimeString() })
            : t('admin.news.autosave_on', 'Desat automàtic actiu')}
        </div>
      </div>

      {/* Featured image */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex items-center gap-2 mb-4 text-neutral-900 font-semibold uppercase text-[11px] tracking-wide">
          <ImageIcon className="w-4 h-4 text-neutral-500" /> {t('admin.news.field_image_url')}
        </div>
        <ImageUpload
          value={formData.image_url}
          onUpload={(url) => setFormData((prev) => ({ ...prev, image_url: url || '' }))}
          folder="news"
        />
      </div>

      {/* Advanced config */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-5">
        <div className="flex items-center gap-2 text-neutral-900 font-semibold uppercase text-[11px] tracking-wide">
          <LinkIcon className="w-4 h-4 text-neutral-500" /> {t('admin.news.advanced_config', 'Configuració avançada')}
        </div>

        <div className="space-y-1">
          <label htmlFor="news-slug" className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
            {t('admin.news.field_slug', 'Enllaç permanent (slug)')}
          </label>
          <input
            id="news-slug"
            type="text"
            value={formData.slug}
            onChange={(event) => setFormData((prev) => ({ ...prev, slug: generateSlug(event.target.value) }))}
            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-xs font-mono focus:ring-2 focus:ring-neutral-300 outline-none transition-colors"
            placeholder="ex: taller-de-families"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="news-sources" className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
            {t('admin.news.field_sources')}
          </label>
          <input
            id="news-sources"
            type="text"
            value={formData.sources}
            onChange={(event) => setFormData((prev) => ({ ...prev, sources: event.target.value }))}
            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:ring-2 focus:ring-neutral-300 outline-none transition-colors"
            placeholder="Ex: Diari de Sant Feliu"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="news-external-url" className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
            {t('admin.news.field_news_url')}
          </label>
          <input
            id="news-external-url"
            type="url"
            value={formData.news_url}
            onChange={(event) => setFormData((prev) => ({ ...prev, news_url: event.target.value }))}
            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:ring-2 focus:ring-neutral-300 outline-none transition-colors"
            placeholder="https://..."
          />
        </div>

        <div className="space-y-2">
          <span className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
            {t('admin.news.field_attachment', 'Adjunt (PDF o imatge)')}
          </span>
          <input ref={attachmentInputRef} type="file" accept="application/pdf,.pdf,image/*" onChange={handleAttachmentUpload} className="hidden" />

          {formData.attachment_url ? (
            <div className="rounded-md bg-neutral-50 border border-neutral-200 p-3 flex items-center justify-between gap-3">
              <a href={formData.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] font-medium text-neutral-800 hover:underline min-w-0">
                <Paperclip className="w-4 h-4 shrink-0" />
                <span className="truncate">{formData.attachment_name || 'arxiu'}</span>
              </a>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" disabled={uploadingAttachment} onClick={() => attachmentInputRef.current?.click()} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-100 transition-colors disabled:opacity-50">
                  {uploadingAttachment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {t('admin.news.attachment_replace', 'Reemplaçar')}
                </button>
                <button type="button" onClick={handleAttachmentRemove} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> {t('admin.news.attachment_remove', 'Treure')}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" disabled={uploadingAttachment} onClick={() => attachmentInputRef.current?.click()} className="w-full px-4 py-3 rounded-md border border-dashed border-neutral-300 bg-neutral-50 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition-colors text-[13px] font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {uploadingAttachment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploadingAttachment ? t('common.uploading') : t('admin.news.attachment_upload', 'Pujar arxiu')}
            </button>
          )}
          <p className="text-[11px] text-neutral-400">{t('admin.news.attachment_hint', 'PDF o imatge (JPG, PNG, GIF, WEBP, AVIF, SVG). Mida màxima: 10MB.')}</p>
        </div>
      </div>

      {/* Event date */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <label htmlFor="news-event-date" className="flex items-center gap-2 mb-4 text-neutral-900 font-semibold uppercase text-[11px] tracking-wide">
          <CalendarIcon className="w-4 h-4 text-neutral-500" /> {t('admin.news.field_event_date')}
        </label>
        <input
          id="news-event-date"
          type="datetime-local"
          lang={nativeDateLocale}
          value={formData.event_date}
          onChange={(event) => setFormData((prev) => ({ ...prev, event_date: event.target.value }))}
          className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:ring-2 focus:ring-neutral-300 outline-none transition-colors"
        />
        <div className="mt-4 p-3 bg-neutral-50 border border-neutral-200 rounded-md flex items-start gap-3">
          <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            {t('admin.news.event_date_hint', 'Si aquesta notícia anuncia una activitat concreta, posa la data aquí per fer-la visible al bloc de calendari.')}
          </p>
        </div>
      </div>
    </div>
  );
}
