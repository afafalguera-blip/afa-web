import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminDocumentsService } from '../../services/admin/AdminDocumentsService';
import type { AdminDocument, DocumentUploadData } from '../../services/admin/AdminDocumentsService';
import { DocumentsAdminHeader } from '../../components/admin/documents/DocumentsAdminHeader';
import { DocumentsAdminList } from '../../components/admin/documents/DocumentsAdminList';
import { DocumentUploadModal } from '../../components/admin/documents/DocumentUploadModal';

export default function DocumentsManager() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AdminDocumentsService.getAll();
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (data: DocumentUploadData) => {
    setUploading(true);
    try {
      await AdminDocumentsService.upload(data);
      setIsModalOpen(false);
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      alert(t('admin.documents.error_upload', 'Error pujant el document. Torna-ho a intentar.'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: AdminDocument) => {
    if (!confirm(t('admin.documents.delete_confirm', 'Segur que vols eliminar aquest document?'))) return;

    try {
      await AdminDocumentsService.delete(doc);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch (error) {
      console.error('Error deleting document:', error);
      alert(t('admin.documents.error_delete', 'Error eliminant el document.'));
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <DocumentsAdminHeader
        onUploadClick={() => setIsModalOpen(true)}
      />

      <DocumentsAdminList
        documents={documents}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onDelete={handleDelete}
      />

      <DocumentUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleUpload}
        uploading={uploading}
      />
    </div>
  );
}
