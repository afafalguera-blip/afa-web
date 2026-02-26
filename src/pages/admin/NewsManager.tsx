import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

interface NewsArticle {
  id: string;
  slug: string;
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

export default function NewsManager() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

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
    navigate('/admin/news/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/admin/news/${id}`);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map(article => (
            <div
              key={article.id}
              className="group bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={article.image_url || 'https://images.unsplash.com/photo-1504711432869-5d39a110fdd7?q=80&w=2070&auto=format&fit=crop'}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${article.published
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-500 text-white'
                    }`}>
                    {article.published ? t('admin.news.status_published') : t('admin.news.status_draft')}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <Calendar className="w-3 h-3" />
                  {new Date(article.created_at).toLocaleDateString()}
                </div>

                <h3 className="font-bold text-lg text-slate-900 line-clamp-2 mb-2 min-h-[3.5rem]">
                  {article.title}
                </h3>

                <p className="text-sm text-slate-500 line-clamp-3 mb-6 min-h-[4.5rem]">
                  {article.excerpt}
                </p>

                <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                  <button
                    onClick={() => handleTogglePublish(article)}
                    className={`p-2 rounded-xl transition-all ${article.published
                      ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                      : 'text-green-500 bg-green-50 hover:bg-green-100'
                      }`}
                    title={article.published ? t('admin.news.unpublish') : t('admin.news.publish')}
                  >
                    {article.published ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(article.id)}
                      className="p-2 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                      title={t('common.edit')}
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(article.id)}
                      className="p-2 text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-all"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
