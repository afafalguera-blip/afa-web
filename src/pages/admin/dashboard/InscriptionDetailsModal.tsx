/**
 * @fileoverview Modal for viewing inscription details
 * Refactored with proper TypeScript interfaces
 */

import { X, Calendar, User, Phone, Mail, Activity, CreditCard } from 'lucide-react';
import type { InscriptionFlat } from '../../../types/inscription';

interface InscriptionDetailsModalProps {
  /** The inscription data to display, or null if modal is closed */
  inscription: InscriptionFlat | null;
  /** Callback to close the modal */
  onClose: () => void;
}

/**
 * Formats a date string to Catalan locale
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ca-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function InscriptionDetailsModal({ inscription, onClose }: InscriptionDetailsModalProps) {
  if (!inscription) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 bg-neutral-50/50">
          <h3 className="text-xl font-bold text-neutral-800 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Detalls de la Inscripció
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-200 rounded-full transition text-neutral-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Student Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-neutral-900 border-b border-neutral-100 pb-2">
                Dades Alumne
              </h4>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase">
                      Nom Complet
                    </label>
                    <p className="text-neutral-900 font-medium">
                      {inscription.name} {inscription.surname}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 uppercase">Curs</label>
                  <p className="text-neutral-900">{inscription.course}</p>
                </div>
              </div>
            </div>

            {/* Parent Info */}
            <div className="space-y-4">
              <h4 className="font-semibold text-neutral-900 border-b border-neutral-100 pb-2">
                Dades Pares/Tutors
              </h4>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase">
                      Telèfon 1
                    </label>
                    <p className="text-neutral-900">{inscription.parent_phone}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase">Email</label>
                    <p className="text-neutral-900 break-all">{inscription.parent_email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activities */}
          <div>
            <h4 className="font-semibold text-neutral-900 border-b border-neutral-100 pb-2 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              Activitats Inscrites
            </h4>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(inscription.activities) ? (
                inscription.activities.map((act: string, i: number) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium border border-purple-100"
                  >
                    {act}
                  </span>
                ))
              ) : (
                <span className="text-neutral-600">{inscription.activities}</span>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-neutral-50 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-500 block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Data Inscripció
              </span>
              <p className="font-medium text-neutral-900">
                {inscription.created_at ? formatDate(inscription.created_at) : 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-neutral-500 block mb-1 flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Soci AFA?
              </span>
              <span
                className={`font-medium ${inscription.afa_member ? 'text-green-600' : 'text-neutral-600'}`}
              >
                {inscription.afa_member ? 'Sí' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block mb-1">ID Inscripció</span>
              <span className="font-mono text-neutral-700 bg-white px-2 py-0.5 rounded border border-neutral-200">
                #{inscription.inscription_id}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-700 font-medium hover:bg-neutral-50 transition"
          >
            Tancar
          </button>
        </div>
      </div>
    </div>
  );
}
