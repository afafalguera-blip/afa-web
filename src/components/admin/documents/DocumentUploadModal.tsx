import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, FileUp } from 'lucide-react';
import { DEFAULT_DOCUMENT_CATEGORIES } from '../../../services/admin/AdminDocumentsService';
import type { DocumentUploadData } from '../../../services/admin/AdminDocumentsService';
import { Modal } from '../../common/Modal';

interface DocumentUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (data: DocumentUploadData) => Promise<void>;
    uploading: boolean;
    /** Categories in use, merged with the defaults. Falls back to the defaults. */
    categories?: string[];
    /** False when the deployed schema has no is_active column. */
    canSetVisibility?: boolean;
}

const NEW_CATEGORY = '__new__';

const EMPTY_FORM = {
    title: '',
    description: '',
    category: 'general',
    newCategory: '',
    isActive: true,
    file: null as File | null
};

export function DocumentUploadModal({
    isOpen,
    onClose,
    onUpload,
    uploading,
    categories,
    canSetVisibility = true
}: DocumentUploadModalProps) {
    const { t } = useTranslation();
    // Mounted only while open (see DocumentsManager), so the form starts empty
    // on every open without an effect re-syncing state.
    const [formData, setFormData] = useState(EMPTY_FORM);

    const options = categories?.length ? categories : [...DEFAULT_DOCUMENT_CATEGORIES];
    const resolvedCategory =
        formData.category === NEW_CATEGORY ? formData.newCategory.trim() : formData.category;
    const canSubmit = !!formData.file && !!formData.title.trim() && !!resolvedCategory;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.file || !canSubmit) return;

        await onUpload({
            title: formData.title.trim(),
            description: formData.description,
            category: resolvedCategory,
            file: formData.file,
            is_active: canSetVisibility ? formData.isActive : undefined
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setFormData(prev => ({ ...prev, file }));
    };

    return (
        <Modal
            open={isOpen}
            onClose={uploading ? () => {} : onClose}
            title={t('admin.documents.upload_title', 'Pujar Document')}
            size="md"
            closeOnBackdrop={!uploading}
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={uploading}
                        className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 transition-colors"
                    >
                        {t('common.cancel', 'Cancel·lar')}
                    </button>
                    <button
                        type="submit"
                        form="document-upload-form"
                        disabled={uploading || !canSubmit}
                        className="flex items-center gap-2 px-4 py-2 rounded-md bg-admin-accent hover:bg-admin-accent-hover text-white text-[13px] font-medium transition-colors disabled:opacity-50"
                    >
                        {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {uploading ? t('common.uploading', 'Pujant...') : t('admin.documents.upload_btn', 'Pujar Document')}
                    </button>
                </>
            }
        >
            <form id="document-upload-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="doc-title" className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                        {t('admin.documents.field_title', 'Títol')} *
                    </label>
                    <input
                        id="doc-title"
                        type="text"
                        required
                        value={formData.title}
                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900/10 text-sm text-neutral-900"
                        placeholder={t('admin.documents.title_placeholder', 'Nom del document')}
                    />
                </div>

                <div>
                    <label htmlFor="doc-category" className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                        {t('admin.documents.field_category', 'Categoria')}
                    </label>
                    <select
                        id="doc-category"
                        value={formData.category}
                        onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900/10 text-sm text-neutral-900 cursor-pointer"
                    >
                        {options.map(cat => (
                            <option key={cat} value={cat} className="capitalize">{cat}</option>
                        ))}
                        <option value={NEW_CATEGORY}>{t('admin.documents.new_category', '➕ Nova categoria...')}</option>
                    </select>
                    {formData.category === NEW_CATEGORY && (
                        <input
                            type="text"
                            value={formData.newCategory}
                            onChange={e => setFormData(prev => ({ ...prev, newCategory: e.target.value }))}
                            placeholder={t('admin.documents.new_category_placeholder', 'Nom de la nova categoria')}
                            aria-label={t('admin.documents.new_category_placeholder', 'Nom de la nova categoria')}
                            className="mt-2 w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900/10 text-sm text-neutral-900"
                        />
                    )}
                </div>

                <div>
                    <label htmlFor="doc-description" className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                        {t('admin.documents.field_description', 'Descripció (Opcional)')}
                    </label>
                    <textarea
                        id="doc-description"
                        value={formData.description}
                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900/10 text-sm text-neutral-900 resize-none"
                        rows={2}
                    />
                </div>

                <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                        {t('admin.documents.field_file', 'Fitxer')} *
                    </span>
                    <input
                        type="file"
                        required
                        onChange={handleFileChange}
                        className="sr-only"
                        id="file-upload"
                    />
                    <label
                        htmlFor="file-upload"
                        className="flex items-center gap-3 w-full px-4 py-3 bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-lg cursor-pointer hover:border-neutral-400 transition-colors"
                    >
                        <FileUp className="w-5 h-5 text-neutral-400" />
                        <span className="text-sm font-medium text-neutral-600 truncate">
                            {formData.file ? formData.file.name : t('admin.documents.choose_file', 'Seleccionar fitxer')}
                        </span>
                    </label>
                </div>

                {canSetVisibility && (
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                            className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                        />
                        <span className="text-sm text-neutral-700">
                            {t('admin.documents.publish_now', 'Publicar immediatament (visible al públic)')}
                        </span>
                    </label>
                )}
            </form>
        </Modal>
    );
}
