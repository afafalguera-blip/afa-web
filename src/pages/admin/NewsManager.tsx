import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AdminNewsService } from '../../services/admin/AdminNewsService';
import type { NewsArticle } from '../../services/PublicNewsService';
import { NewsAdminHeader } from '../../components/admin/news/NewsAdminHeader';
import { NewsAdminFilters } from '../../components/admin/news/NewsAdminFilters';
import { NewsAdminCard } from '../../components/admin/news/NewsAdminCard';

export default function NewsManager() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminNewsService.getAll();
      setArticles(data);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleCreate = () => {
    navigate('/admin/news/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/admin/news/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.news.delete_confirm'))) return;

    try {
      await AdminNewsService.delete(id);
      setArticles(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting article:', error);
      alert(t('common.error_delete'));
    }
  };

  const handleTogglePublish = async (article: NewsArticle) => {
    try {
      const updatedArticle = await AdminNewsService.togglePublish(article);
      setArticles(prev => prev.map(a =>
        a.id === article.id ? updatedArticle : a
      ));
    } catch (error) {
      console.error('Error updating article:', error);
      alert(t('common.error_save'));
    }
  };

  const getReferenceDate = (article: NewsArticle) => article.published_at || article.created_at;

  const toLocalDateKey = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const filteredArticles = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return articles
      .filter((article) => {
        const referenceDate = getReferenceDate(article);
        const articleDateKey = toLocalDateKey(referenceDate);
        const matchesSearch = article.title.toLowerCase().includes(normalizedSearch);
        const matchesFrom = !dateFrom || (articleDateKey !== '' && articleDateKey >= dateFrom);
        const matchesTo = !dateTo || (articleDateKey !== '' && articleDateKey <= dateTo);

        return matchesSearch && matchesFrom && matchesTo;
      })
      .sort((a, b) => {
        const aTime = new Date(getReferenceDate(a)).getTime();
        const bTime = new Date(getReferenceDate(b)).getTime();
        return bTime - aTime;
      });
  }, [articles, searchText, dateFrom, dateTo]);

  const hasActiveFilters = searchText.trim() !== '' || dateFrom !== '' || dateTo !== '';

  return (
    <div className="space-y-6">
      <NewsAdminHeader
        loading={loading}
        onRefresh={fetchArticles}
        onCreate={handleCreate}
      />

      <NewsAdminFilters
        value={searchText}
        onChange={setSearchText}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500">
          {hasActiveFilters ? t('admin.news.no_results') : t('admin.news.no_articles')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map(article => (
            <NewsAdminCard
              key={article.id}
              article={article}
              onTogglePublish={handleTogglePublish}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
