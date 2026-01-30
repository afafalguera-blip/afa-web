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
  RefreshCw
} from 'lucide-react';

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
}

interface NewsFormData {
  title: string;
  content: string;
  excerpt: string;
  image_url: string;
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
    image_url: ''
  });
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
    setFormData({ title: '', content: '', excerpt: '', image_url: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (article: NewsArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content || '',
      excerpt: article.excerpt || '',
      image_url: article.image_url || ''
    });
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

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert(t('admin.news.title_required'));
      return;
    }

    setSaving(true);
    try {
      if (editingArticle) {
        const { error } = await supabase
          .from('news')
          .update({
            title: formData.title,
            content: formData.content,
            excerpt: formData.excerpt,
            image_url: formData.image_url || null
          })
          .eq('id', editingArticle.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('news')
          .insert([{
            title: formData.title,
            content: formData.content,
            excerpt: formData.excerpt,
            image_url: formData.image_url || null,
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
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('admin.news.field_title')} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={t('admin.news.title_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('admin.news.field_excerpt')}
                </label>
                <input
                  type="text"
                  value={formData.excerpt}
                  onChange={e => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={t('admin.news.excerpt_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('admin.news.field_content')}
                </label>
                <textarea
                  value={formData.content}
                  onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={8}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder={t('admin.news.content_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('admin.news.field_image_url')}
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={e => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="https://..."
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
