import { useTranslation } from 'react-i18next';
import { Search, FileText, Trash2, FolderOpen } from 'lucide-react';
import type { AdminDocument } from '../../../services/admin/AdminDocumentsService';

interface DocumentsAdminListProps {
    documents: AdminDocument[];
    loading: boolean;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onDelete: (doc: AdminDocument) => void;
}

export function DocumentsAdminList({
    documents,
    loading,
    searchTerm,
    onSearchChange,
    onDelete
}: DocumentsAdminListProps) {
    const { t } = useTranslation();

    const filteredDocs = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            {/* Search */}
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder={t('admin.documents.search_placeholder', 'Cercar per títol o categoria...')}
                        value={searchTerm}
                        onChange={e => onSearchChange(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all text-neutral-900 dark:text-white font-medium"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="p-20 text-center text-neutral-500 flex flex-col items-center">
                    <FolderOpen className="w-16 h-16 mb-6 text-neutral-200 dark:text-neutral-800" />
                    <p className="text-lg font-medium">{t('admin.documents.no_documents', 'No hi ha documents.')}</p>
                </div>
            ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {filteredDocs.map(doc => (
                        <div key={doc.id} className="p-6 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 flex items-center justify-between gap-6 transition-all group">
                            <div className="flex items-center gap-5 overflow-hidden">
                                <div className="p-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-lg flex-shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-neutral-900 dark:text-white group-hover:text-primary transition-colors truncate text-lg">
                                        {doc.title}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                        <span className="uppercase bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg text-neutral-600 dark:text-neutral-300 font-black tracking-wider text-[10px]">
                                            {doc.category}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                                        <span>{(doc.size_bytes / 1024).toFixed(1)} KB</span>
                                        <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => onDelete(doc)}
                                className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title={t('common.delete', 'Eliminar')}
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
