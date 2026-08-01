import { useTranslation } from 'react-i18next';
import { Calendar, Edit, Trash2 } from 'lucide-react';
import type { NewsArticle } from '../../../services/PublicNewsService';
import { proxyStorageUrl } from '../../../utils/storageUrl';
import { ContentStatusBadge, VisibilityToggleButton } from './ContentStatusBadge';

interface NewsAdminCardProps {
    article: NewsArticle;
    onTogglePublish: (article: NewsArticle) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export function NewsAdminCard({ article, onTogglePublish, onEdit, onDelete }: NewsAdminCardProps) {
    const { t } = useTranslation();

    return (
        <div className="group bg-white border border-neutral-200 rounded-lg overflow-hidden transition-shadow hover:shadow-sm">
            <div className="relative h-44 overflow-hidden bg-neutral-100">
                <img
                    src={proxyStorageUrl(article.image_url) || 'https://images.unsplash.com/photo-1504711432869-5d39a110fdd7?q=80&w=2070&auto=format&fit=crop'}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
            </div>

            <div className="p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                    <ContentStatusBadge visible={article.published} hiddenKind="draft" />
                    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
                        <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                        {new Date(article.published_at || article.created_at).toLocaleDateString()}
                    </span>
                </div>

                <h3 className="font-semibold text-[15px] text-neutral-900 line-clamp-2 mb-2 min-h-[2.75rem]">
                    {article.title}
                </h3>

                <p className="text-[13px] text-neutral-500 line-clamp-3 mb-5 min-h-[3.75rem]">
                    {article.excerpt}
                </p>

                <div className="flex items-center justify-between gap-2 border-t border-neutral-100 pt-4">
                    <VisibilityToggleButton
                        visible={article.published}
                        hiddenKind="draft"
                        onToggle={() => onTogglePublish(article)}
                    />

                    <div className="flex gap-1">
                        <button
                            type="button"
                            onClick={() => onEdit(article.id)}
                            className="p-2 rounded-md text-neutral-600 hover:bg-neutral-100 transition-colors"
                            title={t('common.edit')}
                            aria-label={t('common.edit')}
                        >
                            <Edit className="w-[18px] h-[18px]" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onDelete(article.id)}
                            className="p-2 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                            title={t('common.delete')}
                            aria-label={t('common.delete')}
                        >
                            <Trash2 className="w-[18px] h-[18px]" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
