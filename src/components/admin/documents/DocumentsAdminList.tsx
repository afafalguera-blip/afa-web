import { useTranslation } from 'react-i18next';
import { Search, FileText, Trash2, FolderOpen, Eye, EyeOff } from 'lucide-react';
import type { AdminDocument } from '../../../services/admin/AdminDocumentsService';

interface DocumentsAdminListProps {
    documents: AdminDocument[];
    loading: boolean;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onDelete: (doc: AdminDocument) => void;
    /** Omitted when the deployed schema has no visibility column. */
    onToggleActive?: (doc: AdminDocument) => void;
}

export function DocumentsAdminList({
    documents,
    loading,
    searchTerm,
    onSearchChange,
    onDelete,
    onToggleActive
}: DocumentsAdminListProps) {
    const { t } = useTranslation();

    const term = searchTerm.trim().toLowerCase();
    const filteredDocs = documents.filter(doc =>
        doc.title.toLowerCase().includes(term) ||
        doc.category.toLowerCase().includes(term) ||
        (doc.description ?? '').toLowerCase().includes(term)
    );

    return (
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-neutral-100 bg-neutral-50/60">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder={t('admin.documents.search_placeholder', 'Cercar per títol o categoria...')}
                        aria-label={t('admin.documents.search_placeholder', 'Cercar per títol o categoria...')}
                        value={searchTerm}
                        onChange={e => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900/10 text-[13px] text-neutral-900"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-900"></div>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="p-16 text-center text-neutral-500 flex flex-col items-center">
                    <FolderOpen className="w-12 h-12 mb-4 text-neutral-200" />
                    <p className="text-sm font-medium">
                        {term ? t('common.no_results', 'Sense resultats') : t('admin.documents.no_documents', 'No hi ha documents.')}
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-neutral-100">
                    {filteredDocs.map(doc => {
                        const isActive = doc.is_active ?? true;
                        return (
                            <div key={doc.id} className="p-5 hover:bg-neutral-50 flex items-center justify-between gap-6 transition-colors group">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="p-3 bg-neutral-100 text-neutral-500 rounded-lg flex-shrink-0">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className={`font-bold truncate ${isActive ? 'text-neutral-900' : 'text-neutral-400 line-through'}`}>
                                            {doc.title}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs font-medium text-neutral-500">
                                            <span className="uppercase bg-neutral-100 px-2 py-0.5 rounded text-neutral-600 font-bold tracking-wider text-[10px]">
                                                {doc.category}
                                            </span>
                                            {!isActive && (
                                                <span className="uppercase bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-amber-700 font-bold tracking-wider text-[10px]">
                                                    {t('admin.documents.hidden_badge', 'Ocult')}
                                                </span>
                                            )}
                                            <span>{(doc.size_bytes / 1024).toFixed(1)} KB</span>
                                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {onToggleActive && (
                                        <button
                                            type="button"
                                            onClick={() => onToggleActive(doc)}
                                            className={`p-2 rounded-lg transition-colors ${isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-neutral-400 hover:bg-neutral-100'}`}
                                            title={isActive ? t('admin.documents.hide', 'Ocultar al públic') : t('admin.documents.show', 'Mostrar al públic')}
                                            aria-label={isActive ? t('admin.documents.hide', 'Ocultar al públic') : t('admin.documents.show', 'Mostrar al públic')}
                                        >
                                            {isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => onDelete(doc)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title={t('common.delete', 'Eliminar')}
                                        aria-label={t('common.delete', 'Eliminar')}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
