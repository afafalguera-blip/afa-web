import { useEffect, useState } from 'react';
// import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { 
  Search, 
  Trash2, 
  FileText,
  Upload,
  X,
  Loader2,
  FolderOpen
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  description: string;
  category: string;
  file_url: string;
  file_path: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
}

const CATEGORIES = [
  'actes', 'normativa', 'general', 'menjador', 'extraescolars'
];

export default function DocumentsManager() {
  // const { t } = useTranslation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Upload State
  const [uploading, setUploading] = useState(false);
  // const [uploadProgress, setUploadProgress] = useState(0); 
  const [newDoc, setNewDoc] = useState({
    title: '',
    description: '',
    category: 'general',
    file: null as File | null
  });

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewDoc({ ...newDoc, file: e.target.files[0] });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.file || !newDoc.title) return;

    setUploading(true);
    try {
      const file = newDoc.file;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${newDoc.category}/${fileName}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // 3. Insert into Database
      const { error: dbError } = await supabase
        .from('documents')
        .insert([{
          title: newDoc.title,
          description: newDoc.description,
          category: newDoc.category,
          file_url: publicUrl,
          file_path: filePath,
          file_type: file.type,
          size_bytes: file.size
        }]);

      if (dbError) throw dbError;

      // Reset & Refresh
      setIsModalOpen(false);
      setNewDoc({ title: '', description: '', category: 'general', file: null });
      fetchDocuments();

    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error uploading document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Segur que vols eliminar aquest document?')) return;

    try {
      // 1. Delete from Storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path]);

      if (storageError) {
          console.error("Storage delete error", storageError);
          // Continue to delete DB record anyway? Usually yes.
      }

      // 2. Delete from DB
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error deleting document');
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestió de Documents</h1>
          <p className="text-slate-500">Puja actes, normatives i altres documents públics.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Upload className="w-4 h-4" />
          Nou Document
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-slate-200">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Cercar per títol o categoria..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
        </div>

        {loading ? (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        ) : filteredDocs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                <FolderOpen className="w-12 h-12 mb-4 text-slate-300" />
                <p>No hi ha documents.</p>
            </div>
        ) : (
            <div className="divide-y divide-slate-100">
                {filteredDocs.map(doc => (
                    <div key={doc.id} className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 overflow-hidden">
                            <div className="p-3 bg-slate-100 text-slate-500 rounded-lg flex-shrink-0">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-slate-900 truncate">{doc.title}</h3>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold tracking-wider text-[10px]">
                                        {doc.category}
                                    </span>
                                    <span>•</span>
                                    <span>{(doc.size_bytes / 1024).toFixed(1)} KB</span>
                                    <span>•</span>
                                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDelete(doc)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold">Pujar Document</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Títol</label>
                <input 
                  type="text" 
                  required
                  value={newDoc.title}
                  onChange={e => setNewDoc({...newDoc, title: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Nom del document"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                <select
                  value={newDoc.category}
                  onChange={e => setNewDoc({...newDoc, category: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                    {CATEGORIES.map(cat => (
                        <option key={cat} value={cat} className="capitalize">{cat}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripció (Opcional)</label>
                <textarea 
                  value={newDoc.description}
                  onChange={e => setNewDoc({...newDoc, description: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fitxer</label>
                <input 
                  type="file" 
                  required
                  onChange={handleFileChange}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {uploading ? 'Pujant...' : 'Pujar Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
