import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import {
  Save,
  ChevronLeft,
  Wand2,
  Image as ImageIcon,
  Link as LinkIcon,
  Calendar as CalendarIcon,
  Info,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Link2,
  ImagePlus,
  Eraser,
  Eye,
  EyeOff,
  Clock3,
  FileText
} from 'lucide-react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { ImageUpload } from '../../components/admin/ImageUpload';
import { TranslationService } from '../../services/TranslationService';
import { sanitizeRichTextHtml } from '../../utils/htmlSanitizer';
import { getReadabilityMetrics } from '../../utils/readability';
import { fromDateTimeLocalInputValue, toDateTimeLocalInputValue } from '../../utils/dateTime';

type Lang = 'ca' | 'es' | 'en';

interface TranslationFields {
  title: string;
  excerpt: string;
  content: string;
}

interface NewsFormData {
  slug: string;
  image_url: string;
  news_url: string;
  sources: string;
  published: boolean;
  published_at: string | null;
  event_date: string;
  translations: Record<Lang, TranslationFields>;
}

interface ToolbarButtonProps {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
}

const AVAILABLE_LANGS: Lang[] = ['ca', 'es', 'en'];
const DRAFT_STORAGE_PREFIX = 'afa:news-editor:draft';

const createEmptyTranslations = (): Record<Lang, TranslationFields> => ({
  ca: { title: '', excerpt: '', content: '' },
  es: { title: '', excerpt: '', content: '' },
  en: { title: '', excerpt: '', content: '' }
});

const createDefaultFormData = (): NewsFormData => ({
  slug: '',
  image_url: '',
  news_url: '',
  sources: '',
  published: false,
  published_at: null,
  event_date: '',
  translations: createEmptyTranslations()
});

const buildDraftKey = (articleId: string | undefined) => `${DRAFT_STORAGE_PREFIX}:${articleId || 'new'}`;

const generateSlug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const sanitizeTranslations = (translations: Record<Lang, TranslationFields>): Record<Lang, TranslationFields> =>
  AVAILABLE_LANGS.reduce(
    (acc, lang) => {
      const value = translations[lang] || { title: '', excerpt: '', content: '' };

      acc[lang] = {
        title: value.title.trim(),
        excerpt: value.excerpt.trim(),
        content: sanitizeRichTextHtml(value.content)
      };

      return acc;
    },
    createEmptyTranslations()
  );

const normalizeTranslations = (
  value: unknown,
  fallbackEs: TranslationFields
): Record<Lang, TranslationFields> => {
  const empty = createEmptyTranslations();
  if (!value || typeof value !== 'object') {
    return { ...empty, es: { ...empty.es, ...fallbackEs } };
  }

  const source = value as Partial<Record<Lang, Partial<TranslationFields>>>;

  return {
    ca: { ...empty.ca, ...(source.ca || {}) },
    es: { ...empty.es, ...fallbackEs, ...(source.es || {}) },
    en: { ...empty.en, ...(source.en || {}) }
  };
};
function ToolbarButton({ title, active = false, disabled = false, onClick, icon }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`h-9 w-9 rounded-lg border text-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <span className="flex items-center justify-center">{icon}</span>
    </button>
  );
}

function setLink(editor: Editor) {
  const previous = editor.getAttributes('link').href as string | undefined;
  const url = window.prompt('URL del enlace', previous || 'https://');
  if (url === null) return;

  if (url.trim() === '') {
    editor.chain().focus().unsetLink().run();
    return;
  }

  editor
    .chain()
    .focus()
    .setLink({
      href: url.trim(),
      target: '_blank',
      rel: 'noopener noreferrer'
    })
    .run();
}

function addImage(editor: Editor) {
  const imageUrl = window.prompt('URL de la imagen');
  if (!imageUrl || !imageUrl.trim()) return;

  editor
    .chain()
    .focus()
    .setImage({
      src: imageUrl.trim(),
      alt: ''
    })
    .run();
}

export default function NewsEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({
        autolink: true,
        openOnClick: false,
        defaultProtocol: 'https'
      }),
      Image.configure({ allowBase64: false }),
      Placeholder.configure({ placeholder: t('admin.news.content_placeholder') })
    ],
    content: activeContent,
    editorProps: {
      attributes: {
        class:
          'min-h-[420px] px-6 py-5 text-lg leading-relaxed text-slate-700 focus:outline-none prose prose-slate max-w-none'
      }
    },
    onUpdate: ({ editor: editorInstance }) => {
      setFormData((prev) => ({
        ...prev,
        translations: {
          ...prev.translations,
          [activeLang]: {
            ...prev.translations[activeLang],
            content: editorInstance.getHTML()
          }
        }
      }));
    }
  });

  const isDirty = useMemo(() => JSON.stringify(formData) !== initialSnapshot, [formData, initialSnapshot]);
  const metrics = useMemo(() => getReadabilityMetrics(activeContent), [activeContent]);
  const previewHtml = useMemo(() => sanitizeRichTextHtml(activeContent), [activeContent]);

  useEffect(() => {
    const loadNewsData = async () => {
      if (!id || id === 'new') {
        const draft = localStorage.getItem(draftKey);

        if (draft) {
          try {
            const parsed = JSON.parse(draft) as NewsFormData;
            setFormData(parsed);
            setSlugManuallyEdited(Boolean(parsed.slug));
            setInitialSnapshot(JSON.stringify(parsed));
          } catch {
            const fallback = createDefaultFormData();
            setFormData(fallback);
            setInitialSnapshot(JSON.stringify(fallback));
          }
        } else {
          const fallback = createDefaultFormData();
          setFormData(fallback);
          setInitialSnapshot(JSON.stringify(fallback));
        }

        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.from('news').select('*').eq('id', id).single();
        if (error) throw error;

        const fallbackEs: TranslationFields = {
          title: data.title || '',
          excerpt: data.excerpt || '',
          content: data.content || ''
        };

        const nextData: NewsFormData = {
          slug: data.slug || '',
          image_url: data.image_url || '',
          news_url: data.news_url || '',
          sources: data.sources || '',
          published: Boolean(data.published),
          published_at: data.published_at || null,
          event_date: toDateTimeLocalInputValue(data.event_date),
          translations: normalizeTranslations(data.translations, fallbackEs)
        };

        setFormData(nextData);
        setSlugManuallyEdited(Boolean(nextData.slug));
        setInitialSnapshot(JSON.stringify(nextData));
      } catch (error) {
        console.error('Error fetching article:', error);
        alert('Error cargando la noticia');
        navigate('/admin/news');
      } finally {
        setLoading(false);
      }
    };

    loadNewsData();
  }, [id, navigate, draftKey]);

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== activeContent) {
      editor.commands.setContent(activeContent || '', { emitUpdate: false });
    }
  }, [activeContent, editor]);

  useEffect(() => {
    if (loading) return;

    const autosaveTimer = window.setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(formData));
      setLastAutosaveAt(new Date().toISOString());
    }, 800);

    return () => window.clearTimeout(autosaveTimer);
  }, [draftKey, formData, loading]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const updateTranslationField = (lang: Lang, field: keyof TranslationFields, value: string) => {
    setFormData((prev) => {
      const nextData: NewsFormData = {
        ...prev,
        translations: {
          ...prev.translations,
          [lang]: {
            ...prev.translations[lang],
            [field]: value
          }
        }
      };

      if (field === 'title' && lang === 'es' && !slugManuallyEdited) {
        nextData.slug = generateSlug(value);
      }

      return nextData;
    });
  };

  const handleAutoTranslate = async () => {
    const sourceContent = formData.translations[activeLang];

    if (!sourceContent.title.trim()) {
      alert(t('admin.news.fill_source_first'));
      return;
    }

    setIsTranslating(true);

    try {
      const targetLangs = AVAILABLE_LANGS.filter((lang) => lang !== activeLang);
      const updatedTranslations = { ...formData.translations };

      for (const lang of targetLangs) {
        const translated = await TranslationService.translateNews(sourceContent, lang, activeLang);
        if (!translated) continue;

        updatedTranslations[lang] = {
          title: translated.title || '',
          excerpt: translated.excerpt || '',
          content: translated.content || ''
        };
      }

      setFormData((prev) => ({
        ...prev,
        translations: updatedTranslations
      }));
    } catch (error) {
      console.error('Translation error:', error);
      alert(t('common.error_translation'));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleBack = () => {
    if (isDirty && !window.confirm('Hay cambios sin guardar. ¿Quieres salir igualmente?')) {
      return;
    }

    navigate('/admin/news');
  };

  const handleSave = async () => {
    const sanitizedTranslations = sanitizeTranslations(formData.translations);
    const primaryContent = sanitizedTranslations.es;

    if (!primaryContent.title) {
      alert(t('admin.news.title_required'));
      return;
    }

    const finalSlug = generateSlug(formData.slug || primaryContent.title);
    if (!finalSlug) {
      alert('El slug es obligatorio');
      return;
    }

    setSaving(true);

    try {
      let slugQuery = supabase.from('news').select('id').eq('slug', finalSlug).limit(1);
      if (id && id !== 'new') {
        slugQuery = slugQuery.neq('id', id);
      }

      const { data: slugCollision, error: slugError } = await slugQuery;
      if (slugError) throw slugError;

      if (slugCollision && slugCollision.length > 0) {
        alert('Ya existe una noticia con ese slug');
        return;
      }

      const now = new Date().toISOString();
      const payload = {
        title: primaryContent.title,
        slug: finalSlug,
        content: primaryContent.content,
        excerpt: primaryContent.excerpt,
        image_url: formData.image_url || null,
        news_url: formData.news_url.trim() || null,
        sources: formData.sources.trim() || null,
        published: formData.published,
        published_at: formData.published ? formData.published_at || now : null,
        event_date: fromDateTimeLocalInputValue(formData.event_date),
        translations: sanitizedTranslations,
        updated_at: now
      };

      if (id && id !== 'new') {
        const { error } = await supabase.from('news').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('news').insert([payload]);
        if (error) throw error;
      }

      localStorage.removeItem(draftKey);
      navigate('/admin/news');
    } catch (error) {
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
      <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 shadow-sm transition-all text-slate-500 active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-none mb-1">
              {id === 'new' ? 'Nova Notícia' : 'Editar Notícia'}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">URL:</span>
              <code className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-lg">
                /noticies/{formData.slug || '...'}
              </code>
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-xs uppercase tracking-wider"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Ocultar Preview' : 'Ver Preview'}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden border-b-4 border-b-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-inner">
                {AVAILABLE_LANGS.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setActiveLang(lang)}
                    className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${
                      activeLang === lang
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAutoTranslate}
                disabled={isTranslating}
                className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white rounded-xl text-xs font-black hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 disabled:opacity-50"
              >
                <Wand2 className={`w-4 h-4 ${isTranslating ? 'animate-pulse' : ''}`} />
                {isTranslating ? 'Traduint...' : 'Auto-traduir'}
              </button>
            </div>

            <div className="p-8 sm:p-12 space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                  Títol de la notícia ({activeLang})
                </label>
                <input
                  type="text"
                  value={formData.translations[activeLang]?.title || ''}
                  onChange={(event) => updateTranslationField(activeLang, 'title', event.target.value)}
                  className="w-full px-0 text-4xl sm:text-5xl font-black text-slate-900 border-none focus:ring-0 placeholder:text-slate-200 bg-transparent leading-tight"
                  placeholder="Escriu un títol impactant..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                  Resum o entradilla
                </label>
                <textarea
                  value={formData.translations[activeLang]?.excerpt || ''}
                  onChange={(event) => updateTranslationField(activeLang, 'excerpt', event.target.value)}
                  className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:ring-0 focus:border-blue-200 outline-none transition-all resize-none text-lg text-slate-600 font-medium leading-relaxed italic"
                  rows={3}
                  placeholder="Un breu resum que convidi a llegir més..."
                />
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                  Cos de la notícia
                </label>

                <div className="rounded-3xl border-2 border-slate-100 overflow-hidden">
                  <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50 p-3">
                    <ToolbarButton title="Negrita" active={editor?.isActive('bold')} disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()} icon={<Bold className="w-4 h-4" />} />
                    <ToolbarButton title="Cursiva" active={editor?.isActive('italic')} disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()} icon={<Italic className="w-4 h-4" />} />
                    <ToolbarButton title="Subrayado" active={editor?.isActive('underline')} disabled={!editor} onClick={() => editor?.chain().focus().toggleUnderline().run()} icon={<UnderlineIcon className="w-4 h-4" />} />
                    <ToolbarButton title="Tachado" active={editor?.isActive('strike')} disabled={!editor} onClick={() => editor?.chain().focus().toggleStrike().run()} icon={<Strikethrough className="w-4 h-4" />} />
                    <ToolbarButton title="H1" active={editor?.isActive('heading', { level: 1 })} disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} icon={<Heading1 className="w-4 h-4" />} />
                    <ToolbarButton title="H2" active={editor?.isActive('heading', { level: 2 })} disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} icon={<Heading2 className="w-4 h-4" />} />
                    <ToolbarButton title="H3" active={editor?.isActive('heading', { level: 3 })} disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} icon={<Heading3 className="w-4 h-4" />} />
                    <ToolbarButton title="Lista" active={editor?.isActive('bulletList')} disabled={!editor} onClick={() => editor?.chain().focus().toggleBulletList().run()} icon={<List className="w-4 h-4" />} />
                    <ToolbarButton title="Lista ordenada" active={editor?.isActive('orderedList')} disabled={!editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()} icon={<ListOrdered className="w-4 h-4" />} />
                    <ToolbarButton title="Cita" active={editor?.isActive('blockquote')} disabled={!editor} onClick={() => editor?.chain().focus().toggleBlockquote().run()} icon={<Quote className="w-4 h-4" />} />
                    <ToolbarButton title="Enlace" active={editor?.isActive('link')} disabled={!editor} onClick={() => { if (editor) setLink(editor); }} icon={<Link2 className="w-4 h-4" />} />
                    <ToolbarButton title="Imagen" disabled={!editor} onClick={() => { if (editor) addImage(editor); }} icon={<ImagePlus className="w-4 h-4" />} />
                    <ToolbarButton title="Limpiar formato" disabled={!editor} onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()} icon={<Eraser className="w-4 h-4" />} />
                  </div>

                  <EditorContent editor={editor} />
                </div>
              </div>

              {showPreview && (
                <div className="rounded-3xl border border-slate-200 p-6 bg-slate-50/60">
                  <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <Eye className="w-4 h-4" />
                    Vista previa ({activeLang})
                  </div>

                  <article className="prose prose-slate max-w-none bg-white rounded-2xl p-6 border border-slate-100">
                    <h1>{formData.translations[activeLang].title || 'Título de la noticia'}</h1>
                    <p className="lead">{formData.translations[activeLang].excerpt || 'Resumen de la noticia...'}</p>
                    <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  </article>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
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
                  <FileText className="w-3.5 h-3.5" />
                  Paraules
                </div>
                <div className="text-2xl font-black text-slate-900">{metrics.words}</div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
                  <Clock3 className="w-3.5 h-3.5" />
                  Lectura
                </div>
                <div className="text-2xl font-black text-slate-900">{metrics.minutes} min</div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100 text-xs text-slate-500 flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              {lastAutosaveAt ? `Autoguardado: ${new Date(lastAutosaveAt).toLocaleTimeString()}` : 'Autoguardado activo'}
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
            <div className="flex items-center gap-2 mb-6 text-slate-900 font-black uppercase text-[10px] tracking-widest">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              Imatge destacada
            </div>
            <ImageUpload
              value={formData.image_url}
              onUpload={(url) => setFormData((prev) => ({ ...prev, image_url: url || '' }))}
              folder="news"
            />
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-2 mb-2 text-slate-900 font-black uppercase text-[10px] tracking-widest">
              <LinkIcon className="w-4 h-4 text-blue-600" />
              Configuració avanzada
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Enllaç Permanent (Slug)</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(event) => {
                  setSlugManuallyEdited(true);
                  setFormData((prev) => ({ ...prev, slug: generateSlug(event.target.value) }));
                }}
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
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
            <div className="flex items-center gap-2 mb-6 text-slate-900 font-black uppercase text-[10px] tracking-widest">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              Data de l'Esdeveniment
            </div>
            <input
              type="datetime-local"
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
      </div>
    </div>
  );
}
