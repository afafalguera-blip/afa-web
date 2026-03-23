import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image as ImageIcon, Link as LinkIcon, Calendar as CalendarIcon,
  Info, FileText, Clock3, Wand2, Upload, Trash2, Loader2, Paperclip
} from 'lucide-react';
import { ImageUpload } from '../ImageUpload';
import { StorageService } from '../../../services/StorageService';
import { generateSlug, type NewsFormData } from '../../../services/admin/AdminNewsEditorService';

interface NewsEditorSidebarProps {
  formData: NewsFormData;
  setFormData: React.Dispatch<React.SetStateAction<NewsFormData>>;
  metrics: { words: number; minutes: number };
  lastAutosaveAt: string | null;
  nativeDateLocale: string;
}

export function NewsEditorSidebar({ formData, setFormData, metrics, lastAutosaveAt, nativeDateLocale }: NewsEditorSidebarProps) {
  const { t } = useTranslation();
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      alert('Solo se permiten archivos PDF');
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('El PDF supera el tamaño máximo (10MB)');
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
      return;
    }

    setUploadingAttachment(true);
    try {
      const uploadedUrl = await StorageService.uploadFile('activity-images', file, 'news/pdfs');
      setFormData((prev) => ({ ...prev, attachment_url: uploadedUrl, attachment_name: file.name }));
    } catch (error) {
      console.error('Error uploading PDF attachment:', error);
      alert(t('common.error_save'));
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
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${formData.published ? 'bg-green-500' : 'bg-amber-400'}`} />
            <span className="font-bold text-slate-900">{formData.published ? 'Publicada' : 'Esborrany'}</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
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
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
              <FileText className="w-3.5 h-3.5" /> Paraules
            </div>
            <div className="text-2xl font-black text-slate-900">{metrics.words}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
              <Clock3 className="w-3.5 h-3.5" /> Lectura
            </div>
            <div className="text-2xl font-black text-slate-900">{metrics.minutes} min</div>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100 text-xs text-slate-500 flex items-center gap-2">
          <Wand2 className="w-4 h-4" />
          {lastAutosaveAt ? `Autoguardado: ${new Date(lastAutosaveAt).toLocaleTimeString()}` : 'Autoguardado activo'}
        </div>
      </div>

      {/* Featured image */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
        <div className="flex items-center gap-2 mb-6 text-slate-900 font-black uppercase text-[10px] tracking-widest">
          <ImageIcon className="w-4 h-4 text-blue-600" /> Imatge destacada
        </div>
        <ImageUpload
          value={formData.image_url}
          onUpload={(url) => setFormData((prev) => ({ ...prev, image_url: url || '' }))}
          folder="news"
        />
      </div>

      {/* Advanced config */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-2 mb-2 text-slate-900 font-black uppercase text-[10px] tracking-widest">
          <LinkIcon className="w-4 h-4 text-blue-600" /> Configuració avanzada
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Enllaç Permanent (Slug)</label>
          <input
            type="text"
            value={formData.slug}
            onChange={(event) => setFormData((prev) => ({ ...prev, slug: generateSlug(event.target.value) }))}
            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-mono font-bold focus:border-blue-200 outline-none transition-all"
            placeholder="ej: taller-de-familias"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Font de la notícia</label>
          <input
            type="text"
            value={formData.sources}
            onChange={(event) => setFormData((prev) => ({ ...prev, sources: event.target.value }))}
            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-200 outline-none transition-all"
            placeholder="Ej: Diari de Sant Feliu"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">URL Externa</label>
          <input
            type="url"
            value={formData.news_url}
            onChange={(event) => setFormData((prev) => ({ ...prev, news_url: event.target.value }))}
            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-200 outline-none transition-all"
            placeholder="https://..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Adjunt PDF</label>
          <input ref={attachmentInputRef} type="file" accept="application/pdf,.pdf" onChange={handleAttachmentUpload} className="hidden" />

          {formData.attachment_url ? (
            <div className="rounded-2xl bg-slate-50 border-2 border-slate-100 p-3 flex items-center justify-between gap-3">
              <a href={formData.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-semibold text-blue-700 min-w-0">
                <Paperclip className="w-4 h-4 shrink-0" />
                <span className="truncate">{formData.attachment_name || 'document.pdf'}</span>
              </a>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" disabled={uploadingAttachment} onClick={() => attachmentInputRef.current?.click()} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50">
                  {uploadingAttachment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Reemplaçar
                </button>
                <button type="button" onClick={handleAttachmentRemove} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Treure
                </button>
              </div>
            </div>
          ) : (
            <button type="button" disabled={uploadingAttachment} onClick={() => attachmentInputRef.current?.click()} className="w-full px-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:text-blue-700 transition-colors text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {uploadingAttachment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploadingAttachment ? 'Pujant PDF...' : 'Pujar PDF'}
            </button>
          )}
          <p className="text-[10px] text-slate-400 ml-1">Format PDF. Mida màxima: 10MB.</p>
        </div>
      </div>

      {/* Event date */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
        <div className="flex items-center gap-2 mb-6 text-slate-900 font-black uppercase text-[10px] tracking-widest">
          <CalendarIcon className="w-4 h-4 text-blue-600" /> Data de l'Esdeveniment
        </div>
        <input
          type="datetime-local"
          lang={nativeDateLocale}
          value={formData.event_date}
          onChange={(event) => setFormData((prev) => ({ ...prev, event_date: event.target.value }))}
          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-200 outline-none transition-all"
        />
        <div className="mt-4 p-4 bg-slate-50 rounded-2xl flex items-start gap-3">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            Si aquesta notícia anuncia una activitat concreta, posa la data aquí per fer-la visible al bloc de calendari.
          </p>
        </div>
      </div>
    </div>
  );
}
