import { useTranslation } from 'react-i18next';
import { X, Loader2, FileUp } from 'lucide-react';
import { CATEGORIES } from '../../../services/admin/AdminDocumentsService';
import type { DocumentUploadData } from '../../../services/admin/AdminDocumentsService';

interface DocumentUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (data: DocumentUploadData) => Promise<void>;
    uploading: boolean;
}

export function DocumentUploadModal({
    isOpen,
    onClose,
    onUpload,
    uploading
}: DocumentUploadModalProps) {
    const { t } = useTranslation();

    const [formData, setFormData] = React.useState({
        title: '',
        description: '',
        category: 'general',
        file: null as File | null
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.file || !formData.title) return;

        await onUpload({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            file: formData.file
        });

        // Reset form on success is handled by parent closing modal
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({ ...prev, file: e.target.files![0] }));
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-8 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {t('admin.documents.upload_title', 'Pujar Document')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                            {t('admin.documents.field_title', 'Títol')} *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-transparent focus:border-primary dark:focus:border-primary rounded-2xl outline-none transition-all text-slate-900 dark:text-white font-medium shadow-inner"
                            placeholder={t('admin.documents.title_placeholder', 'Nom del document')}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                            {t('admin.documents.field_category', 'Categoria')}
                        </label>
                        <select
                            value={formData.category}
                            onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-transparent focus:border-primary dark:focus:border-primary rounded-2xl outline-none transition-all text-slate-900 dark:text-white font-medium shadow-inner appearance-none cursor-pointer"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat} className="capitalize">{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                            {t('admin.documents.field_description', 'Descripció (Opcional)')}
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-transparent focus:border-primary dark:focus:border-primary rounded-2xl outline-none transition-all text-slate-900 dark:text-white font-medium shadow-inner resize-none"
                            rows={2}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                            {t('admin.documents.field_file', 'Fitxer')} *
                        </label>
                        <div className="relative">
                            <input
                                type="file"
                                required
                                onChange={handleFileChange}
                                className="hidden"
                                id="file-upload"
                            />
                            <label
                                htmlFor="file-upload"
                                className="flex items-center gap-3 w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
                            >
                                <FileUp className="w-5 h-5 text-slate-400 group-hover:text-primary" />
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-primary truncate">
                                    {formData.file ? formData.file.name : t('admin.documents.choose_file', 'Seleccionar fitxer')}
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                        >
                            {t('common.cancel', 'Cancel·lar')}
                        </button>
                        <button
                            type="submit"
                            disabled={uploading || !formData.file || !formData.title}
                            className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all disabled:opacity-50 shadow-xl shadow-primary/20 active:scale-95"
                        >
                            {uploading && <Loader2 className="w-5 h-5 animate-spin" />}
                            {uploading ? t('common.uploading', 'Pujant...') : t('admin.documents.upload_btn', 'Pujar Document')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Helper to use React in internal component
import React from 'react';
