import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { 
  FileText, 
  Download, 
  Search, 
  FolderOpen,
  File,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { es, ca } from 'date-fns/locale';

interface Document {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string;
  file_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

const CATEGORIES = [
  { id: 'all', label: 'Tots', icon: FolderOpen },
  { id: 'actes', label: 'Actes', icon: FileText },
  { id: 'normativa', label: 'Normativa', icon:  File },
  { id: 'general', label: 'General', icon: FileText },
  { id: 'menjador', label: 'Menjador', icon: FileText },
  { id: 'extraescolars', label: 'Extraescolars', icon: FileText }
];

export function DocumentsPage() {
  const { i18n } = useTranslation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesCategory = activeCategory === 'all' || doc.category.toLowerCase() === activeCategory;
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = () => {
    // Return icon based on type if needed, specific icons for pdf, doc, etc.
    return FileText;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4">
              Documents i Recursos
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Espai de descàrrega de documentació oficial, actes, normativa i informació d'interès per a les famílies.
            </p>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-center">
            {/* Categories */}
            <div className="flex overflow-x-auto gap-2 pb-2 md:pb-0 w-full md:w-auto no-scrollbar mask-gradient">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                            activeCategory === cat.id 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                    >
                        <cat.icon className="w-4 h-4" />
                        <span className="font-bold text-sm">{cat.label}</span>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Cercar documents..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>

        {/* Documents Grid */}
        {loading ? (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
        ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No s'han trobat documents.</p>
            </div>
        ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocuments.map((doc) => {
                    const Icon = getFileIcon();
                    return (
                        <div key={doc.id} className="group bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100 dark:border-slate-700 flex flex-col">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Icon className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                                    {doc.category}
                                </span>
                            </div>
                            
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
                                {doc.title}
                            </h3>
                            
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-1 line-clamp-2">
                                {doc.description || 'Sense descripció'}
                            </p>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {format(new Date(doc.created_at), 'd MMM yyyy', { locale: i18n.language === 'ca' ? ca : es })}
                                </span>
                                
                                <a 
                                    href={doc.file_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    {formatFileSize(doc.size_bytes)}
                                </a>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

      </div>
    </div>
  );
}
