/**
 * @fileoverview Modal for editing inscription details
 * Refactored with proper TypeScript interfaces
 */

import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { AdminService } from '../../../services/AdminService';
import type { InscriptionFlat } from '../../../types/inscription';

/** Extended inscription type with optional student_index for editing */
interface EditableInscription extends InscriptionFlat {
  student_index?: number;
}

interface InscriptionEditModalProps {
  /** The inscription to edit, or null if modal is closed */
  inscription: EditableInscription | null;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback after successful save */
  onSave: () => void;
}

interface FormData {
  name: string;
  surname: string;
  course: string;
  parent_phone: string;
  parent_email: string;
  afa_member: boolean;
  activities: string; // Comma-separated for easier editing
}

const INITIAL_FORM_DATA: FormData = {
  name: '',
  surname: '',
  course: '',
  parent_phone: '',
  parent_email: '',
  afa_member: false,
  activities: '',
};

/** Available course options */
const COURSE_OPTIONS = ['I3', 'I4', 'I5', '1r', '2n', '3r', '4t', '5è', '6è'] as const;

export function InscriptionEditModal({ inscription, onClose, onSave }: InscriptionEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  useEffect(() => {
    if (inscription) {
      setFormData({
        name: inscription.name || '',
        surname: inscription.surname || '',
        course: inscription.course || '',
        parent_phone: inscription.parent_phone || '',
        parent_email: inscription.parent_email || '',
        afa_member: inscription.afa_member || false,
        activities: Array.isArray(inscription.activities)
          ? inscription.activities.join(', ')
          : inscription.activities || '',
      });
    }
  }, [inscription]);

  const handleChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inscription) return;

    setIsLoading(true);
    try {
      const updates = {
        ...formData,
        activities: formData.activities
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };

      await AdminService.updateInscription(
        inscription.inscription_id,
        updates,
        inscription.student_index
      );
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating:', error);
      alert('Error al guardar els canvis');
    } finally {
      setIsLoading(false);
    }
  };

  if (!inscription) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-800">Editar Inscripció</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cognoms</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                value={formData.surname}
                onChange={(e) => handleChange('surname', e.target.value)}
              />
            </div>
          </div>

          {/* Course */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Curs</label>
            <select
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              value={formData.course}
              onChange={(e) => handleChange('course', e.target.value)}
            >
              <option value="">Selecciona curs</option>
              {COURSE_OPTIONS.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>

          {/* Contact fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telèfon Pares</label>
              <input
                type="tel"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                value={formData.parent_phone}
                onChange={(e) => handleChange('parent_phone', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Pares</label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                value={formData.parent_email}
                onChange={(e) => handleChange('parent_email', e.target.value)}
              />
            </div>
          </div>

          {/* Activities */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Activitats (separades par comes)
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              value={formData.activities}
              onChange={(e) => handleChange('activities', e.target.value)}
              placeholder="Ex: Futbol, Anglès"
            />
            <p className="text-xs text-slate-500 mt-1">Introdueix les activitats exactes.</p>
          </div>

          {/* AFA Member */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="afa_member"
              checked={formData.afa_member}
              onChange={(e) => handleChange('afa_member', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="afa_member" className="text-sm font-medium text-slate-700">
              Soci de l'AFA
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition"
          >
            Cancel·lar
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
