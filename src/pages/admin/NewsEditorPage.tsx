import { useEffect, useState } from 'react';
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
    Info
} from 'lucide-react';
import { ImageUpload } from '../../components/admin/ImageUpload';
import { TranslationService } from '../../services/TranslationService';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function NewsEditorPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(id !== 'new');
    const [saving, setSaving] = useState(false);
    const [activeLang, setActiveLang] = useState<'ca' | 'es' | 'en'>('es');
    const [isTranslating, setIsTranslating] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        content: '',
        excerpt: '',
        image_url: '',
        news_url: '',
        sources: '',
        published: false,
        event_date: '',
        translations: {
            ca: { title: '', excerpt: '', content: '' },
            es: { title: '', excerpt: '', content: '' },
            en: { title: '', excerpt: '', content: '' }
        } as Record<string, { title: string; excerpt: string; content: string }>
    });

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                const { data, error } = await supabase
                    .from('news')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (data) {
                    setFormData({
                        title: data.title,
                        slug: data.slug || '',
                        content: data.content || '',
                        excerpt: data.excerpt || '',
                        image_url: data.image_url || '',
                        news_url: data.news_url || '',
                        sources: data.sources || '',
                        published: data.published,
                        event_date: data.event_date ? new Date(data.event_date).toISOString().slice(0, 16) : '',
                        translations: {
                            ca: { title: '', excerpt: '', content: '' },
                            es: { title: data.title, excerpt: data.excerpt || '', content: data.content || '' },
                            en: { title: '', excerpt: '', content: '' },
                            ...(data.translations || {})
                        }
                    });
                }
            } catch (error) {
                console.error('Error fetching article:', error);
                alert('Error cargando la noticia');
                navigate('/admin/news');
            } finally {
                setLoading(false);
            }
        };

        if (id && id !== 'new') {
            fetchArticle();
        }
    }, [id, navigate]);

    const generateSlug = (text: string) => {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    };

    const updateTranslationField = (lang: string, field: string, value: string) => {
        setFormData(prev => {
            const newTranslations = {
                ...prev.translations,
                [lang]: {
                    ...prev.translations[lang],
                    [field]: value
                }
            };

            let newSlug = prev.slug;
            if (field === 'title' && lang === 'es' && id === 'new' && !prev.slug) {
                newSlug = generateSlug(value);
            }

            const updatedData = {
                ...prev,
                translations: newTranslations,
                slug: newSlug
            };

            if (lang === 'es') {
                (updatedData as any)[field] = value;
            }

            return updatedData;
        });
    };

    const handleAutoTranslate = async () => {
        const sourceContent = formData.translations[activeLang];
        if (!sourceContent.title) {
            alert('Rellena el título en el idioma actual primero');
            return;
        }

        setIsTranslating(true);
        try {
            const targetLangs = (['ca', 'es', 'en'] as const).filter(l => l !== activeLang);
            const updatedTranslations = { ...formData.translations };

            for (const lang of targetLangs) {
                const translated = await TranslationService.translateNews(sourceContent, lang, activeLang);
                if (translated) {
                    updatedTranslations[lang] = {
                        title: translated.title || '',
                        excerpt: translated.excerpt || '',
                        content: translated.content || ''
                    };
                }
            }

            setFormData(prev => ({ ...prev, translations: updatedTranslations }));
        } catch (error) {
            console.error('Translation error:', error);
            alert('Error en la traducción');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSave = async () => {
        if (!formData.translations.es.title.trim() && !formData.title.trim()) {
            alert('El título es obligatorio');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                title: formData.translations.es.title || formData.title,
                slug: formData.slug || generateSlug(formData.translations.es.title || formData.title),
                content: formData.translations.es.content || formData.content,
                excerpt: formData.translations.es.excerpt || formData.excerpt,
                image_url: formData.image_url || null,
                news_url: formData.news_url || null,
                sources: formData.sources || null,
                published: formData.published,
                event_date: formData.event_date ? new Date(formData.event_date).toISOString() : null,
                translations: formData.translations,
                updated_at: new Date().toISOString()
            };

            if (id && id !== 'new') {
                const { error } = await supabase.from('news').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('news').insert([payload]);
                if (error) throw error;
            }

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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/news')}
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

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Save className="w-5 h-5" />
                        {saving ? t('common.saving') : t('common.save')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden border-b-4 border-b-slate-100">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-inner">
                                {(['ca', 'es', 'en'] as const).map((lang) => (
                                    <button
                                        key={lang}
                                        onClick={() => setActiveLang(lang)}
                                        className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${activeLang === lang
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        {lang.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            <button
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
                                    onChange={e => updateTranslationField(activeLang, 'title', e.target.value)}
                                    className="w-full px-0 text-4xl sm:text-5xl font-black text-slate-900 border-none focus:ring-0 placeholder:text-slate-100 bg-transparent leading-tight"
                                    placeholder="Escriu un títol impactant..."
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                                    Resum o entradilla
                                </label>
                                <textarea
                                    value={formData.translations[activeLang]?.excerpt || ''}
                                    onChange={e => updateTranslationField(activeLang, 'excerpt', e.target.value)}
                                    className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:ring-0 focus:border-blue-200 outline-none transition-all resize-none text-lg text-slate-600 font-medium leading-relaxed italic"
                                    rows={3}
                                    placeholder="Un breu resum que convidi a llegir més..."
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                                    Cos de la notícia
                                </label>
                                <div className="relative">
                                    <ReactQuill
                                        theme="snow"
                                        value={formData.translations[activeLang]?.content || ''}
                                        onChange={value => updateTranslationField(activeLang, 'content', value)}
                                        modules={{
                                            toolbar: [
                                                [{ 'header': [1, 2, 3, false] }],
                                                ['bold', 'italic', 'underline', 'strike'],
                                                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                ['link', 'blockquote', 'image'],
                                                ['clean']
                                            ],
                                        }}
                                        className="big-editor"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full animate-pulse ${formData.published ? 'bg-green-500' : 'bg-amber-400'}`} />
                                <span className="font-bold text-slate-900">{formData.published ? 'Publicada' : 'Esborrany'}</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.published}
                                    onChange={e => setFormData(prev => ({ ...prev, published: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
                        <div className="flex items-center gap-2 mb-6 text-slate-900 font-black uppercase text-[10px] tracking-widest">
                            <ImageIcon className="w-4 h-4 text-blue-600" />
                            Imatge destacada
                        </div>
                        <ImageUpload
                            value={formData.image_url}
                            onUpload={(url) => setFormData(prev => ({ ...prev, image_url: url || '' }))}
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
                                onChange={e => setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }))}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-mono font-bold focus:border-blue-200 outline-none transition-all"
                                placeholder="ej: taller-de-familias"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Font de la notícia</label>
                            <input
                                type="text"
                                value={formData.sources}
                                onChange={e => setFormData(prev => ({ ...prev, sources: e.target.value }))}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-200 outline-none transition-all"
                                placeholder="Ej: Diari de Sant Feliu"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">URL Externa</label>
                            <input
                                type="url"
                                value={formData.news_url}
                                onChange={e => setFormData(prev => ({ ...prev, news_url: e.target.value }))}
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
                            onChange={e => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-200 outline-none transition-all"
                        />
                        <div className="mt-4 p-4 bg-slate-50 rounded-2xl flex items-start gap-3">
                            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                Si aquesta notícia anuncia una activitat concreta, posa la fecha aquí per a que aparegui un calendari destacat a la pàgina.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        .big-editor .ql-container {
          min-height: 500px;
          border-bottom-left-radius: 2rem;
          border-bottom-right-radius: 2rem;
          font-family: inherit;
          font-size: 1.125rem;
          border: 2px solid #f1f5f9 !important;
          border-top: none !important;
        }
        .big-editor .ql-toolbar {
          border-top-left-radius: 1.5rem;
          border-top-right-radius: 1.5rem;
          background: #f8fafc;
          border: 2px solid #f1f5f9 !important;
          padding: 1rem !important;
        }
        .big-editor .ql-editor {
          padding: 2rem !important;
        }
        .big-editor .ql-editor.ql-blank::before {
          left: 2rem !important;
          color: #e2e8f0;
          font-style: normal;
        }
      `}</style>
        </div>
    );
}
