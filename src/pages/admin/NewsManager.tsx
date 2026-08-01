import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Newspaper } from 'lucide-react';
import { AdminNewsService, type NewsPublishedFilter } from '../../services/admin/AdminNewsService';
import type { NewsArticle } from '../../services/PublicNewsService';
import { AdminPageHeader } from '../../components/admin/common/AdminPageHeader';
import { AdminPagination } from '../../components/admin/common/AdminTable';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { NewsAdminFilters } from '../../components/admin/news/NewsAdminFilters';
import { NewsAdminCard } from '../../components/admin/news/NewsAdminCard';

const DEFAULT_PAGE_SIZE = 25;

export default function NewsManager() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [publishedFilter, setPublishedFilter] = useState<NewsPublishedFilter>('all');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchText.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  // Any filter change invalidates the current offset.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateFrom, dateTo, publishedFilter, pageSize]);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const { rows, total: count } = await AdminNewsService.list({
        page,
        pageSize,
        search: debouncedSearch,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        published: publishedFilter
      });
      setArticles(rows);
      setTotal(count);
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error(t('common.error_generic'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, dateFrom, dateTo, publishedFilter, toast, t]);

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
    const article = articles.find((item) => item.id === id);
    const accepted = await confirm({
      title: t('admin.news.delete_confirm'),
      itemName: article?.title,
      confirmLabel: t('common.delete'),
      destructive: true
    });
    if (!accepted) return;

    try {
      await AdminNewsService.delete(id);
      toast.success(t('admin.news.deleted', 'Notícia eliminada'));
      await fetchArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error(t('common.error_delete'));
    }
  };

  const handleTogglePublish = async (article: NewsArticle) => {
    try {
      const updatedArticle = await AdminNewsService.togglePublish(article);
      setArticles((prev) => prev.map((item) => (item.id === article.id ? updatedArticle : item)));
      toast.success(
        updatedArticle.published
          ? t('admin.status.published_toast', 'Contingut publicat')
          : t('admin.status.unpublished_toast', 'Contingut despublicat')
      );
    } catch (error) {
      console.error('Error updating article:', error);
      toast.error(t('common.error_save'));
    }
  };

  const hasActiveFilters =
    debouncedSearch !== '' || dateFrom !== '' || dateTo !== '' || publishedFilter !== 'all';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AdminPageHeader
        title={t('admin.news.title')}
        subtitle={t('admin.news.subtitle')}
        icon={Newspaper}
        loading={loading}
        onRefresh={fetchArticles}
        onCreate={handleCreate}
        createLabel={t('admin.news.new_article')}
      />

      <NewsAdminFilters
        value={searchText}
        onChange={setSearchText}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        publishedFilter={publishedFilter}
        onPublishedFilterChange={setPublishedFilter}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center text-neutral-500">
          {hasActiveFilters ? t('admin.news.no_results') : t('admin.news.no_articles')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
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

      <div className="bg-white border border-neutral-200 rounded-lg px-4 py-2.5">
        <AdminPagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
