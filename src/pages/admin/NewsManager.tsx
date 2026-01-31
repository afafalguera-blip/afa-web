import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Calendar,
  RefreshCw,
  Wand2
} from 'lucide-react';
import { ImageUpload } from '../../components/admin/ImageUpload';
import { TranslationService } from '../../services/TranslationService';

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  image_url: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  event_date?: string | null;
  news_url?: string | null;
  sources?: string | null;
  translations?: Record<string, { title: string; excerpt: string; content: string }>;
}

interface NewsFormData {
  title: string;
  content: string;
  excerpt: string;
  image_url: string;
  news_url: string;
  sources: string;
  event_date: string;
  translations: Record<string, { title: string; excerpt: string; content: string }>;
}

export default function NewsManager() {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [formData, setFormData] = useState<NewsFormData>({
    title: '',
    content: '',
    excerpt: '',
    image_url: '',
    news_url: '',
    sources: '',
    event_date: '',
    translations: {
      ca: { title: '', excerpt: '', content: '' },
      es: { title: '', excerpt: '', content: '' },
      en: { title: '', excerpt: '', content: '' }
    }
  });
  const [activeLang, setActiveLang] = useState<'ca' | 'es' | 'en'>('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingArticle(null);
    setFormData({ 
      title: '', 
      content: '', 
      excerpt: '', 
      image_url: '',
      news_url: '',
      sources: '',
      event_date: '',
      translations: {
        ca: { title: '', excerpt: '', content: '' },
        es: { title: '', excerpt: '', content: '' },
        en: { title: '', excerpt: '', content: '' }
      }
    });
    setActiveLang('es');
    setIsModalOpen(true);
  };

  const handleEdit = (article: NewsArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content || '',
      excerpt: article.excerpt || '',
      image_url: article.image_url || '',
      news_url: article.news_url || '',
      sources: article.sources || '',
      event_date: article.event_date ? new Date(article.event_date).toISOString().slice(0, 16) : '',
      translations: {
        ca: { title: '', excerpt: '', content: '' },
        es: { title: article.title, excerpt: article.excerpt || '', content: article.content || '' },
        en: { title: '', excerpt: '', content: '' },
        ...(article.translations || {})
      }
    });
    setActiveLang('es');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.news.delete_confirm'))) return;
    
    try {
      const { error } = await supabase.from('news').delete().eq('id', id);
      if (error) throw error;
      setArticles(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting article:', error);
      alert(t('common.error_delete'));
    }
  };

  const handleTogglePublish = async (article: NewsArticle) => {
    const newPublished = !article.published;
    const publishedAt = newPublished ? new Date().toISOString() : null;

    try {
      const { error } = await supabase
        .from('news')
        .update({ published: newPublished, published_at: publishedAt })
        .eq('id', article.id);

      if (error) throw error;
      
      setArticles(prev => prev.map(a => 
        a.id === article.id 
          ? { ...a, published: newPublished, published_at: publishedAt }
          : a
      ));
    } catch (error) {
      console.error('Error updating article:', error);
      alert(t('common.error_save'));
    }
  };

  const handleAutoTranslate = async () => {
    // Determine source language content
    const sourceContent = formData.translations[activeLang];
    
    if (!sourceContent.title) {
      alert(t('admin.news.fill_source_first'));
      return;
    }

    setIsTranslating(true);
    try {
      const targetLangs = (['ca', 'es', 'en'] as const).filter(l => l !== activeLang);
      
      const updatedTranslations = { ...formData.translations };
      
      for (const lang of targetLangs) {
        const translated = await TranslationService.translateNews(
          sourceContent,
          lang,
          activeLang
        );
        if (translated) {
          updatedTranslations[lang] = {
            title: translated.title || '',
            excerpt: translated.excerpt || '',
            content: translated.content || ''
          };
        }
      }

      setFormData(prev => ({
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

  const updateTranslationField = (lang: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [lang]: {
          ...prev.translations[lang],
          [field]: value
        }
      },
      // Update primary fields if activeLang is 'es' (default)
      ...(lang === 'es' ? { [field]: value } : {})
    }));
  };

  const handleSave = async () => {
    if (!formData.translations.es.title.trim() && !formData.title.trim()) {
      alert(t('admin.news.title_required'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.translations.es.title || formData.title,
        content: formData.translations.es.content || formData.content,
        excerpt: formData.translations.es.excerpt || formData.excerpt,
        image_url: formData.image_url || null,
        news_url: formData.news_url || null,
        sources: formData.sources || null,
        event_date: formData.event_date ? new Date(formData.event_date).toISOString() : null,
        translations: formData.translations
      };

      if (editingArticle) {
        const { error } = await supabase
          .from('news')
          .update(payload)
          .eq('id', editingArticle.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('news')
          .insert([{
            ...payload,
            published: false
          }]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchArticles();
    } catch (error) {
      console.error('Error saving article:', error);
      alert(t('common.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('admin.news.title')}</h1>
          <p className="text-slate-500">{t('admin.news.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchArticles}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('admin.news.new_article')}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder={t('admin.news.search_placeholder')}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* Articles List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          {searchText ? t('admin.news.no_results') : t('admin.news.no_articles')}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredArticles.map(article => (
            <div 
              key={article.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 truncate">{article.title}</h3>
                    {article.published ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        {t('admin.news.status_published')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                        {t('admin.news.status_draft')}
                      </span>
                    )}
                  </div>
                  {article.excerpt && (
                    <p className="text-sm text-slate-500 line-clamp-2">{article.excerpt}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(article.created_at).toLocaleDateString()}
                    </span>
                    {article.published_at && (
                      <span>
                        {t('admin.news.published_at')}: {new Date(article.published_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTogglePublish(article)}
                    className={`p-2 rounded-lg transition-colors ${
                      article.published 
                        ? 'text-amber-600 hover:bg-amber-50' 
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={article.published ? t('admin.news.unpublish') : t('admin.news.publish')}
                  >
                    {article.published ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleEdit(article)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title={t('common.edit')}
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(article.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingArticle ? t('admin.news.edit_article') : t('admin.news.new_article')}
              </h2>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Language Tabs */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex gap-2">
                  {(['ca', 'es', 'en'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveLang(lang)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeLang === lang
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleAutoTranslate}
                  disabled={isTranslating}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition-all disabled:opacity-50"
                  title="Traducir automáticamente al resto de idiomas"
                >
                  <Wand2 className={`w-4 h-4 ${isTranslating ? 'animate-pulse' : ''}`} />
                  {isTranslating ? 'Traduciendo...' : 'Auto-traducir'}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('admin.news.field_title')} ({activeLang.toUpperCase()}) *
                  </label>
                  <input
                    type="text"
                    value={formData.translations[activeLang]?.title || ''}
                    onChange={e => updateTranslationField(activeLang, 'title', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={t('admin.news.title_placeholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('admin.news.field_excerpt')} ({activeLang.toUpperCase()})
                  </label>
                  <input
                    type="text"
                    value={formData.translations[activeLang]?.excerpt || ''}
                    onChange={e => updateTranslationField(activeLang, 'excerpt', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={t('admin.news.excerpt_placeholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('admin.news.field_content')} ({activeLang.toUpperCase()})
                  </label>
                  <textarea
                    value={formData.translations[activeLang]?.content || ''}
                    onChange={e => updateTranslationField(activeLang, 'content', e.target.value)}
                    rows={8}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder={t('admin.news.content_placeholder')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('admin.news.field_image_url')}
                </label>
                <ImageUpload
                  value={formData.image_url}
                  onUpload={(url) => setFormData(prev => ({ ...prev, image_url: url || '' }))}
                  folder="news"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('admin.news.field_event_date')}
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.event_date}
                    onChange={e => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('admin.news.field_news_url')}
                  </label>
                  <input
                    type="url"
                    value={formData.news_url}
                    onChange={e => setFormData(prev => ({ ...prev, news_url: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('admin.news.field_sources')}
                </label>
                <input
                  type="text"
                  value={formData.sources}
                  onChange={e => setFormData(prev => ({ ...prev, sources: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej: Diario Local, AFA News..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
