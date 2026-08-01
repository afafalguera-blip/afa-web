import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Upload } from 'lucide-react';
import {
  AdminDocumentsService,
  DocumentVisibilityUnsupportedError,
  type AdminDocument,
  type DocumentUploadData
} from '../../services/admin/AdminDocumentsService';
import { AdminPageHeader } from '../../components/admin/common/AdminPageHeader';
import { DocumentsAdminList } from '../../components/admin/documents/DocumentsAdminList';
import { DocumentUploadModal } from '../../components/admin/documents/DocumentUploadModal';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';

export default function DocumentsManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  // False when the deployed schema has no is_active column: the toggle is hidden
  // instead of throwing, so an older database degrades to "everything public".
  const [visibilitySupported, setVisibilitySupported] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const [data, cats, supportsVisibility] = await Promise.all([
        AdminDocumentsService.getAll(),
        AdminDocumentsService.getCategories(),
        AdminDocumentsService.supportsVisibility()
      ]);
      setDocuments(data);
      setCategories(cats);
      setVisibilitySupported(supportsVisibility);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error(t('admin.documents.error_load', 'Error carregant els documents.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (data: DocumentUploadData) => {
    setUploading(true);
    try {
      await AdminDocumentsService.upload(data);
      setIsModalOpen(false);
      toast.success(t('admin.documents.uploaded', 'Document pujat correctament.'));
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(t('admin.documents.error_upload', 'Error pujant el document. Torna-ho a intentar.'));
    } finally {
      setUploading(false);
    }
  };

  const handleToggleActive = async (doc: AdminDocument) => {
    const next = !(doc.is_active ?? true);
    try {
      await AdminDocumentsService.setActive(doc.id, next);
      setDocuments(prev => prev.map(d => (d.id === doc.id ? { ...d, is_active: next } : d)));
      toast.success(next
        ? t('admin.documents.now_public', 'Document visible al públic.')
        : t('admin.documents.now_hidden', 'Document ocult al públic.'));
    } catch (error) {
      console.error('Error toggling document visibility:', error);
      if (error instanceof DocumentVisibilityUnsupportedError) {
        setVisibilitySupported(false);
        toast.error(t('admin.documents.visibility_unsupported', 'La base de dades encara no admet ocultar documents.'));
        return;
      }
      toast.error(t('common.error_save'));
    }
  };

  const handleDelete = async (doc: AdminDocument) => {
    const ok = await confirm({
      title: t('admin.documents.delete_title', 'Eliminar document'),
      message: t('admin.documents.delete_confirm', 'Segur que vols eliminar aquest document?'),
      itemName: doc.title,
      destructive: true
    });
    if (!ok) return;

    try {
      await AdminDocumentsService.delete(doc);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast.success(t('admin.documents.deleted', 'Document eliminat.'));
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error(t('admin.documents.error_delete', 'Error eliminant el document.'));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <AdminPageHeader
        title={t('admin.documents.title', 'Gestió de Documents')}
        subtitle={t('admin.documents.subtitle', 'Puja actes, normatives i altres documents públics.')}
        icon={FileText}
        loading={loading}
        onRefresh={fetchDocuments}
        onCreate={() => setIsModalOpen(true)}
        createLabel={t('admin.documents.new_document', 'Nou document')}
        createIcon={Upload}
      />

      {!visibilitySupported && (
        <p className="text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          {t('admin.documents.visibility_missing_note', 'Tots els documents pujats són públics immediatament: la base de dades encara no té la columna de visibilitat.')}
        </p>
      )}

      <DocumentsAdminList
        documents={documents}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onDelete={handleDelete}
        onToggleActive={visibilitySupported ? handleToggleActive : undefined}
      />

      {isModalOpen && (
        <DocumentUploadModal
          isOpen
          onClose={() => setIsModalOpen(false)}
          onUpload={handleUpload}
          uploading={uploading}
          categories={categories}
          canSetVisibility={visibilitySupported}
        />
      )}
    </div>
  );
}
