import { Trash2, Eye, Pencil } from 'lucide-react';
// import { supabase } from '../../../lib/supabase';

// Helper to flatten inscriptions into students rows as admin.html does
const flattenInscriptions = (inscriptions: any[], filters: any) => {
  const rows: any[] = [];
  inscriptions.forEach(ins => {
    // Hnadle new format with students array
    if (ins.students && Array.isArray(ins.students)) {
      ins.students.forEach((student: any, index: number) => {
        rows.push({
            ...student,
            inscription_id: ins.id,
            original_inscription: ins, // Keep ref for actions
            student_index: index,
            parent_phone: ins.parent_phone_1,
            parent_email: ins.parent_email_1,
            afa_member: ins.afa_member,
            created_at: ins.created_at,
            status: ins.status // Inscription status, check logic
        });
      });
    } else {
        // Old format
        rows.push({
            name: ins.name || ins.student_name, // fallback
            surname: ins.surname || ins.student_surname,
            course: ins.course,
            activities: ins.activities,
            inscription_id: ins.id,
            original_inscription: ins,
            student_index: -1, // indicating flat
            parent_phone: ins.parent_phone_1,
            parent_email: ins.parent_email_1,
            afa_member: ins.afa_member,
            created_at: ins.created_at,
            status: ins.status,
            suspended: ins.student_suspended
        });
    }
  });

  return rows.filter(row => {
    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const fullName = `${row.name} ${row.surname}`.toLowerCase();
        if (!fullName.includes(searchLower)) return false;
    }
    if (filters.course && row.course !== filters.course) return false;
    if (filters.status !== 'all') {
        if (filters.status === 'suspended' && !row.suspended) return false;
        if (filters.status === 'baja' && row.status !== 'baja') return false;
        if (filters.status === 'alta' && (row.suspended || row.status === 'baja')) return false;
    }
    // Activity filter would need array checking
    return true;
  });
};

export function InscriptionsTable({ inscriptions, loading, filters, onDelete, onStatusChange, onViewDetails, onEdit }: any) {
  if (loading) return <div className="p-8 text-center text-slate-500">Carregant dades...</div>;
  
  const rows = flattenInscriptions(inscriptions, filters);

  return (
    <div className="overflow-x-auto">
      {/* ... keeping headers ... */}
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase text-slate-500 font-semibold">
            <th className="px-6 py-4">Alumne</th>
            <th className="px-6 py-4">Curs</th>
            <th className="px-6 py-4">Activitats</th>
            <th className="px-6 py-4">Contacte</th>
            <th className="px-6 py-4">AFA</th>
            <th className="px-6 py-4">Accions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, idx) => (
            <tr key={`${row.inscription_id}-${idx}`} className="hover:bg-slate-50 transition-colors group">
              <td className="px-6 py-4">
                <div className="font-medium text-slate-900">{row.name} {row.surname}</div>
                {row.suspended && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full cursor-pointer" onClick={() => onStatusChange(row.inscription_id, 'active')}>Suspès</span>}
                {row.status === 'baja' && <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full cursor-pointer" onClick={() => onStatusChange(row.inscription_id, 'active')}>Baixa</span>}
                {!row.suspended && row.status !== 'baja' && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full cursor-pointer" onClick={() => onStatusChange(row.inscription_id, 'baja')}>Actiu</span>}
              </td>
              <td className="px-6 py-4 text-slate-600">{row.course}</td>
              <td className="px-6 py-4 text-slate-600">
                {Array.isArray(row.activities) ? row.activities.join(', ') : row.activities}
              </td>
              <td className="px-6 py-4 text-sm">
                <div className="text-slate-900">{row.parent_phone}</div>
                <div className="text-slate-500">{row.parent_email}</div>
              </td>
              <td className="px-6 py-4">
                {row.afa_member ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Sí</span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">No</span>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onViewDetails(row)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Veure detalls">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => onEdit(row)} className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete(row.inscription_id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                No s'han trobat inscripcions amb els filtres actuals.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
