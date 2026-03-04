import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';

interface DocumentsAdminHeaderProps {
    onUploadClick: () => void;
}

export function DocumentsAdminHeader({ onUploadClick }: DocumentsAdminHeaderProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {t('admin.documents.title', 'Gestió de Documents')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    {t('admin.documents.subtitle', 'Puja actes, normativas i altres documents públics.')}
                </p>
            </div>
            <button
                onClick={onUploadClick}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95"
            >
                <Upload className="w-5 h-5" />
                {t('admin.documents.new_document', 'Nou Document')}
            </button>
        </div>
    );
}
