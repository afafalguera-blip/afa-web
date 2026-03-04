import { Trash2, Eye, Pencil } from 'lucide-react';
import type { InscriptionFlat, InscriptionStatus } from '../../../types/inscription';

interface InscriptionsTableProps {
  rows: InscriptionFlat[];
  loading: boolean;
  onDelete: (id: string | number) => void;
  onStatusChange: (id: string | number, newStatus: InscriptionStatus) => void;
  onViewDetails: (inscription: InscriptionFlat) => void;
  onEdit: (inscription: InscriptionFlat) => void;
}

export function InscriptionsTable({
  rows,
  loading,
  onDelete,
  onStatusChange,
  onViewDetails,
  onEdit
}: InscriptionsTableProps) {
  if (loading) return <div className="p-8 text-center text-slate-500">Carregant dades...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase text-slate-500 font-semibold">
            <th className="px-6 py-4">Alumne</th>
            <th className="px-6 py-4">Curs</th>
            <th className="px-6 py-4">Activitats</th>
            <th className="px-6 py-4">Contacte</th>
            <th className="px-6 py-4">AFA</th>
            <th className="px-6 py-4 text-right">Accions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, idx) => (
            <tr key={`${row.inscription_id}-${idx}`} className="hover:bg-slate-50 transition-colors group">
              <td className="px-6 py-4">
                <div className="font-medium text-slate-900">{row.name} {row.surname}</div>
                <div className="flex gap-1 mt-1">
                  {row.suspended && (
                    <span
                      className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full cursor-pointer hover:bg-amber-100"
                      onClick={() => onStatusChange(row.inscription_id, 'alta')}
                    >
                      Suspès
                    </span>
                  )}
                  {row.status === 'baja' && (
                    <span
                      className="text-[10px] uppercase font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-100"
                      onClick={() => onStatusChange(row.inscription_id, 'alta')}
                    >
                      Baixa
                    </span>
                  )}
                  {!row.suspended && row.status !== 'baja' && (
                    <span
                      className="text-[10px] uppercase font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full cursor-pointer hover:bg-green-100"
                      onClick={() => onStatusChange(row.inscription_id, 'baja')}
                    >
                      Actiu
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 text-slate-600">{row.course}</td>
              <td className="px-6 py-4 text-slate-600">
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(row.activities) ? row.activities.map((act, i) => (
                    <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {act}
                    </span>
                  )) : (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {row.activities}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 text-sm">
                <div className="text-slate-900 font-medium">{row.parent_phone}</div>
                <div className="text-slate-500 text-xs">{row.parent_email}</div>
              </td>
              <td className="px-6 py-4">
                {row.afa_member ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700">Soci</span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-500">No soci</span>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onViewDetails(row)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Veure detalls"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEdit(row)}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(row.inscription_id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
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
