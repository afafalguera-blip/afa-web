import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Save, ChevronLeft, Wand2, Eye, EyeOff } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { TranslationService } from '../../services/TranslationService';
import { sanitizeRichTextHtml } from '../../utils/htmlSanitizer';
import { getReadabilityMetrics } from '../../utils/readability';
import { getRegionalLanguageTag } from '../../utils/locale';
import {
  AdminNewsEditorService,
  createDefaultFormData,
  createEmptyTranslations,
  generateSlug,
  normalizeTranslations,
  type NewsFormData
} from '../../services/admin/AdminNewsEditorService';
import { EditorToolbar } from '../../components/admin/news/EditorToolbar';
import { NewsEditorSidebar } from '../../components/admin/news/NewsEditorSidebar';
import { NewsPreview } from '../../components/admin/news/NewsPreview';

type Lang = 'ca' | 'es' | 'en';
type TranslationField = 'title' | 'excerpt' | 'content';

const AVAILABLE_LANGS: Lang[] = ['ca', 'es', 'en'];
const DRAFT_STORAGE_PREFIX = 'afa:news-editor:draft';
const buildDraftKey = (articleId: string | undefined) => `${DRAFT_STORAGE_PREFIX}:${articleId || 'new'}`;

export default function NewsEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(id !== 'new');
  const [saving, setSaving] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [lastAutosaveAt, setLastAutosaveAt] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [formData, setFormData] = useState<NewsFormData>(() => createDefaultFormData());

  const draftKey = useMemo(() => buildDraftKey(id), [id]);
  const activeContent = formData.translations[activeLang]?.content || '';
  const nativeDateLocale = getRegionalLanguageTag(i18n.resolvedLanguage || i18n.language);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ autolink: true, openOnClick: false, defaultProtocol: 'https' }),
      Image.configure({ allowBase64: false }),
      Placeholder.configure({ placeholder: t('admin.news.content_placeholder') })
    ],
    content: activeContent,
    editorProps: {
      attributes: {
        class: 'min-h-[420px] px-6 py-5 text-lg leading-relaxed text-slate-700 focus:outline-none prose prose-slate max-w-none'
      }
    },
    onUpdate: ({ editor: editorInstance }) => {
      setFormData((prev) => ({
        ...prev,
        translations: {
          ...prev.translations,
          [activeLang]: { ...prev.translations[activeLang], content: editorInstance.getHTML() }
        }
      }));
    }
  });

  const isDirty = useMemo(() => JSON.stringify(formData) !== initialSnapshot, [formData, initialSnapshot]);
  const metrics = useMemo(() => getReadabilityMetrics(activeContent), [activeContent]);
  const previewHtml = useMemo(() => sanitizeRichTextHtml(activeContent), [activeContent]);

  // Load article data
  useEffect(() => {
    const loadData = async () => {
      if (!id || id === 'new') {
        const draft = localStorage.getItem(draftKey);
        let data = createDefaultFormData();

        if (draft) {
          try {
            const parsed = JSON.parse(draft) as Partial<NewsFormData>;
            const fallbackEs = parsed.translations?.es || createEmptyTranslations().es;
            data = { ...data, ...parsed, translations: normalizeTranslations(parsed.translations, fallbackEs) };
            setSlugManuallyEdited(Boolean(data.slug));
          } catch { /* use default */ }
        }

        setFormData(data);
        setInitialSnapshot(JSON.stringify(data));
        setLoading(false);
        return;
      }

      try {
        const data = await AdminNewsEditorService.loadArticle(id);
        setFormData(data);
        setSlugManuallyEdited(Boolean(data.slug));
        setInitialSnapshot(JSON.stringify(data));
      } catch (error) {
        console.error('Error fetching article:', error);
        alert('Error cargando la noticia');
        navigate('/admin/news');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate, draftKey]);

  // Sync editor content on language change
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== activeContent) {
      editor.commands.setContent(activeContent || '', { emitUpdate: false });
    }
  }, [activeContent, editor]);

  // Autosave drafts
  useEffect(() => {
    if (loading) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(formData));
      setLastAutosaveAt(new Date().toISOString());
    }, 800);
    return () => window.clearTimeout(timer);
  }, [draftKey, formData, loading]);

  // Warn on unsaved changes
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const updateTranslationField = (lang: Lang, field: TranslationField, value: string) => {
    setFormData((prev) => {
      const next: NewsFormData = {
        ...prev,
        translations: { ...prev.translations, [lang]: { ...prev.translations[lang], [field]: value } }
      };
      if (field === 'title' && lang === 'es' && !slugManuallyEdited) {
        next.slug = generateSlug(value);
      }
      return next;
    });
  };

  const handleAutoTranslate = async () => {
    const sourceContent = formData.translations[activeLang];
    if (!sourceContent.title.trim()) { alert(t('admin.news.fill_source_first')); return; }

    setIsTranslating(true);
    try {
      const targetLangs = AVAILABLE_LANGS.filter((lang) => lang !== activeLang);
      const updatedTranslations = { ...formData.translations };
      for (const lang of targetLangs) {
        const translated = await TranslationService.translateNews(sourceContent, lang, activeLang);
        if (!translated) continue;
        updatedTranslations[lang] = { title: translated.title || '', excerpt: translated.excerpt || '', content: translated.content || '' };
      }
      setFormData((prev) => ({ ...prev, translations: updatedTranslations }));
    } catch (error) {
      console.error('Translation error:', error);
      alert(t('common.error_translation'));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleBack = () => {
    if (isDirty && !window.confirm('Hay cambios sin guardar. ¿Quieres salir igualmente?')) return;
    navigate('/admin/news');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await AdminNewsEditorService.saveArticle(id, formData);
      localStorage.removeItem(draftKey);
      navigate('/admin/news');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'TITLE_REQUIRED') { alert(t('admin.news.title_required')); return; }
        if (error.message === 'SLUG_REQUIRED') { alert('El slug es obligatorio'); return; }
        if (error.message === 'SLUG_DUPLICATE') { alert('Ya existe una noticia con ese slug'); return; }
      }
      console.error('Error saving article:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] pt-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <button type="button" onClick={handleBack} className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 shadow-sm transition-all text-slate-500 active:scale-95">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-none mb-1">
              {id === 'new' ? 'Nova Notícia' : 'Editar Notícia'}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">URL:</span>
              <code className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-lg">/noticies/{formData.slug || '...'}</code>
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button type="button" onClick={() => setShowPreview((prev) => !prev)} className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-xs uppercase tracking-wider">
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Ocultar Preview' : 'Ver Preview'}
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
            <Save className="w-5 h-5" />
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden border-b-4 border-b-slate-100">
            {/* Language switcher + translate */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-inner">
                {AVAILABLE_LANGS.map((lang) => (
                  <button key={lang} type="button" onClick={() => setActiveLang(lang)} className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${activeLang === lang ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
              <button type="button" onClick={handleAutoTranslate} disabled={isTranslating} className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white rounded-xl text-xs font-black hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 disabled:opacity-50">
                <Wand2 className={`w-4 h-4 ${isTranslating ? 'animate-pulse' : ''}`} />
                {isTranslating ? 'Traduint...' : 'Auto-traduir'}
              </button>
            </div>

            {/* Title, excerpt, body */}
            <div className="p-8 sm:p-12 space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Títol de la notícia ({activeLang})</label>
                <input type="text" value={formData.translations[activeLang]?.title || ''} onChange={(e) => updateTranslationField(activeLang, 'title', e.target.value)} className="w-full px-0 text-4xl sm:text-5xl font-black text-slate-900 border-none focus:ring-0 placeholder:text-slate-200 bg-transparent leading-tight" placeholder="Escriu un títol impactant..." />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Resum o entradilla</label>
                <textarea value={formData.translations[activeLang]?.excerpt || ''} onChange={(e) => updateTranslationField(activeLang, 'excerpt', e.target.value)} className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:ring-0 focus:border-blue-200 outline-none transition-all resize-none text-lg text-slate-600 font-medium leading-relaxed italic" rows={3} placeholder="Un breu resum que convidi a llegir més..." />
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Cos de la notícia</label>
                <div className="rounded-3xl border-2 border-slate-100 overflow-hidden">
                  <EditorToolbar editor={editor} />
                  <EditorContent editor={editor} />
                </div>
              </div>

              {showPreview && (
                <NewsPreview
                  activeLang={activeLang}
                  title={formData.translations[activeLang].title}
                  excerpt={formData.translations[activeLang].excerpt}
                  previewHtml={previewHtml}
                />
              )}
            </div>
          </div>
        </div>

        <NewsEditorSidebar
          formData={formData}
          setFormData={setFormData}
          metrics={metrics}
          lastAutosaveAt={lastAutosaveAt}
          nativeDateLocale={nativeDateLocale}
        />
      </div>
    </div>
  );
}
