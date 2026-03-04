import { FileText, Download, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es, ca } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import type { PublicDocument } from '../../../services/DocumentsService';

interface DocumentCardProps {
    document: PublicDocument;
}

export function DocumentCard({ document }: DocumentCardProps) {
    const { t, i18n } = useTranslation();

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="group bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100 dark:border-slate-700 flex flex-col">
            <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                    {document.category}
                </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
                {document.title}
            </h3>

            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-1 line-clamp-2">
                {document.description || t('documents.no_description', 'Sense descripció')}
            </p>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(document.created_at), 'd MMM yyyy', {
                        locale: i18n.language === 'ca' ? ca : es
                    })}
                </span>

                <a
                    href={document.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-lg transition-colors"
                >
                    <Download className="w-4 h-4" />
                    {formatFileSize(document.size_bytes)}
                </a>
            </div>
        </div>
    );
}
