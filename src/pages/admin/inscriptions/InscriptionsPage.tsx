import { useEffect, useState } from 'react';
import { AdminService } from '../../../services/AdminService';
import { ExportService } from '../../../services/ExportService';
import { RefreshCw, Search, Edit, Trash2, FileSpreadsheet } from 'lucide-react';
import { EditInscriptionModal } from '../../../components/admin/EditInscriptionModal';
import { ExportOptionsModal } from '../../../components/admin/ExportOptionsModal';

// Interface matching the Supabase table 'inscripcions'
interface Inscription {
  id: string;
  created_at: string;
  parent_name: string;
  parent_dni: string;
  parent_phone_1: string;
  parent_email_1: string;
  parent_phone_2?: string;
  
  status: string;
  
  // students is a JSONB array. 
  // Each item should have { name, surname, course, activities: [] }
  students: any[];

  // Extras
  afa_member: boolean;
  image_auth_consent?: string;
  can_leave_alone?: boolean;
  authorized_pickup?: string;
  health_info?: string;
}

export default function InscriptionsPage() {
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingInscription, setEditingInscription] = useState<Inscription | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    fetchInscriptions();
  }, []);

  const fetchInscriptions = async () => {
    try {
      setLoading(true);
      const data = await AdminService.getInscriptions();
      console.log('Inscriptions loaded:', data.length);
      setInscriptions(data);
    } catch (error) {
      console.error('Error fetching inscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Estàs segur que vols eliminar aquesta inscripció? Aquesta acció no es pot desfer.")) return;
    
    try {
      // @ts-ignore - ID type mismatch handling
      await AdminService.deleteInscription(id);
      setInscriptions(prev => prev.filter(ins => ins.id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error al eliminar la inscripció');
    }
  };

  const handleEditClick = (inscription: Inscription) => {
    setEditingInscription(inscription);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (id: string, updates: Partial<Inscription>) => {
    try {
      // @ts-ignore
      await AdminService.updateInscription(id, updates);
      
      // Update local state without refetching if possible, but deep nested updates suggest refetch is safer or careful merge
      setInscriptions(prev => prev.map(ins => ins.id === id ? { ...ins, ...updates } as Inscription : ins));
      alert('Inscripció actualitzada correctament');
    } catch (error) {
      console.error('Error updating:', error);
      alert('Error al guardar els canvis');
      throw error; // Re-throw for modal to handle
    }
  };

  const filteredInscriptions = inscriptions.filter(ins => {
    const searchString = searchTerm.toLowerCase();
    const studentsStr = Array.isArray(ins.students) 
        ? JSON.stringify(ins.students).toLowerCase() 
        : '';

    const matchesSearch = 
      ins.parent_name?.toLowerCase().includes(searchString) ||
      ins.parent_dni?.toLowerCase().includes(searchString) ||
      ins.parent_email_1?.toLowerCase().includes(searchString) ||
      studentsStr.includes(searchString);

    const matchesStatus = statusFilter === 'all' || ins.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Inscripcions</h1>
          <p className="text-sm text-gray-500">Gestió de les inscripcions a extraescolars.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <button 
                onClick={fetchInscriptions}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-white hover:bg-slate-50 h-9 px-4 py-2 text-slate-700"
                title="Recarregar dades"
            >
                <RefreshCw className="h-4 w-4" />
            </button>
            
            <button 
                onClick={() => setIsExportModalOpen(true)}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 h-9 px-4 py-2 gap-2 shadow-sm"
            >
                <FileSpreadsheet className="h-4 w-4" /> Exportar
            </button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Cercar per nom, DNI, email..."
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm pl-9 outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
            className="flex h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Tots els estats</option>
          <option value="alta">Alta</option>
          <option value="pending">Pendent</option>
          <option value="baja">Baixa</option>
        </select>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b text-gray-700 font-medium">
                <tr>
                <th className="px-4 py-3">Pare/Mare/Tutor</th>
                <th className="px-4 py-3">Contacte</th>
                <th className="px-4 py-3">Alumnes</th>
                <th className="px-4 py-3">Estat</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Accions</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {loading ? (
                    <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Wait... Loading...</td>
                    </tr>
                ) : filteredInscriptions.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No s'han trobat inscripcions.</td>
                    </tr>
                ) : (
                    filteredInscriptions.map((inscription) => (
                    <tr key={inscription.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{inscription.parent_name}</div>
                        <div className="text-gray-500 text-xs">{inscription.parent_dni}</div>
                        {inscription.afa_member && (
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-blue-100 text-blue-800 mt-1">
                                Soci AFA
                            </span>
                        )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs">{inscription.parent_email_1}</span>
                            <span className="text-xs">{inscription.parent_phone_1}</span>
                        </div>
                        </td>
                        <td className="px-4 py-3">
                        <div className="space-y-2">
                            {Array.isArray(inscription.students) && inscription.students.map((student: any, idx: number) => (
                            <div key={idx} className={`p-2 rounded border ${student.suspended ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                <p className="font-medium text-xs text-slate-700 flex justify-between">
                                  <span>{student.name} {student.surname} <span className="text-slate-400">({student.course})</span></span>
                                  {student.suspended && <span className="text-[10px] text-red-600 font-bold uppercase">Suspès</span>}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                {student.activities && student.activities.map((act: string, k: number) => (
                                    <span key={k} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-white border border-slate-200 text-slate-600">
                                    {act}
                                    </span>
                                ))}
                                </div>
                            </div>
                            ))}
                        </div>
                        </td>
                        <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent 
                                ${inscription.status === 'alta' ? 'bg-green-100 text-green-800' : 
                                inscription.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'}`}>
                                {inscription.status === 'alta' ? 'Alta' : 
                                inscription.status === 'pending' ? 'Pendent' : 
                                inscription.status === 'baja' ? 'Baixa' : inscription.status}
                            </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(inscription.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                           <div className="flex justify-end gap-2">
                               <button 
                                  onClick={() => handleEditClick(inscription)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Editar"
                               >
                                   <Edit className="w-4 h-4" />
                               </button>
                               <button 
                                  onClick={() => handleDelete(inscription.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                  title="Eliminar"
                               >
                                   <Trash2 className="w-4 h-4" />
                               </button>
                           </div>
                        </td>
                    </tr>
                    ))
                )}
            </tbody>
            </table>
        </div>
      </div>

      {editingInscription && (
        <EditInscriptionModal 
          inscription={editingInscription} 
          isOpen={isEditModalOpen} 
          onClose={() => { setIsEditModalOpen(false); setEditingInscription(null); }}
          onSave={handleSaveEdit}
        />
      )}

      <ExportOptionsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        count={filteredInscriptions.length}
        onExport={(format, type) => {
            if (format === 'excel') {
                ExportService.exportInscriptionsExcel(filteredInscriptions, type === 'full' ? 'full' : 'compact');
            } else {
                ExportService.exportInscriptionsPDF(filteredInscriptions, type === 'full' ? 'full' : 'list');
            }
            setIsExportModalOpen(false);
        }}
      />
    </div>
  );
}
