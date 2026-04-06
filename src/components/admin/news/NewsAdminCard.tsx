import { useTranslation } from 'react-i18next';
import { Calendar, Eye, EyeOff, Edit, Trash2 } from 'lucide-react';
import type { NewsArticle } from '../../../services/PublicNewsService';
import { proxyStorageUrl } from '../../../utils/storageUrl';

interface NewsAdminCardProps {
    article: NewsArticle;
    onTogglePublish: (article: NewsArticle) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export function NewsAdminCard({ article, onTogglePublish, onEdit, onDelete }: NewsAdminCardProps) {
    const { t } = useTranslation();

    return (
        <div
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-[2rem]"
        >
            <div className="relative h-48 overflow-hidden">
                <img
                    src={proxyStorageUrl(article.image_url) || 'https://images.unsplash.com/photo-1504711432869-5d39a110fdd7?q=80&w=2070&auto=format&fit=crop'}
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
                    {new Date(article.published_at || article.created_at).toLocaleDateString()}
                </div>

                <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-2 mb-2 min-h-[3.5rem]">
                    {article.title}
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-6 min-h-[4.5rem]">
                    {article.excerpt}
                </p>

                <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4">
                    <button
                        onClick={() => onTogglePublish(article)}
                        className={`p-2 rounded-xl transition-all ${article.published
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100'
                            : 'text-green-500 bg-green-50 dark:bg-green-950/30 hover:bg-green-100'
                            }`}
                        title={article.published ? t('admin.news.unpublish') : t('admin.news.publish')}
                    >
                        {article.published ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>

                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(article.id)}
                            className="p-2 text-white bg-primary rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/10 active:scale-95"
                            title={t('common.edit')}
                        >
                            <Edit className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => onDelete(article.id)}
                            className="p-2 text-red-500 bg-red-50 dark:bg-red-950/30 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                            title={t('common.delete')}
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
