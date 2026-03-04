import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { DocumentsService, type PublicDocument } from '../services/DocumentsService';
import { DocumentCard } from '../components/public/documents/DocumentCard';
import { DocumentFilters } from '../components/public/documents/DocumentFilters';

export function DocumentsPage() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<PublicDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const data = await DocumentsService.getDocuments();
        setDocuments(data);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const filteredDocuments = documents.filter(doc => {
    const matchesCategory = activeCategory === 'all' || doc.category.toLowerCase() === activeCategory;
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 pb-12">
      <SEO
        title={t('documents.seo_title', 'Documents i Recursos')}
        description={t('documents.seo_description', 'Descarrega actes d\'assemblees, normativa escolar, formularis d\'inscripció i recursos d\'interès de l\'AFA Escola Falguera.')}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4">
            {t('documents.page_title', 'Documents i Recursos')}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t('documents.page_description', 'Espai de descàrrega de documentació oficial, actes, normativa i informació d\'interès per a les famílies.')}
          </p>
        </div>

        {/* Filters & Search */}
        <DocumentFilters
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Documents Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
            <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">
              {t('documents.no_results', 'No s\'han trobat documents.')}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
