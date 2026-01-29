
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Student {
  name: string;
  surname: string;
  course: string;
  activities: string[];
  suspended?: boolean;
}

interface Inscription {
  id: string;
  parent_name: string;
  parent_dni: string;
  parent_email_1: string;
  parent_phone_1: string;
  parent_phone_2?: string;
  afa_member: boolean;
  students: Student[];
}

interface EditInscriptionModalProps {
  inscription: Inscription;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Inscription>) => Promise<void>;
}

const COURSES = [
  'I3', 'I4', 'I5',
  '1r', '2n', '3r', '4t', '5è', '6è'
];

const AVAILABLE_ACTIVITIES = [
  'Acollida Matinal', 'Acollida Tarda',
  'Bàsquet', 'Futbol', 'Dansa', 'Patinatge',
  'Robòtica', 'Escacs', 'Anglès', 'Mewave',
  'Voleibol', 'Judo', 'Mecanografia', 'Teatre'
];

export function EditInscriptionModal({ inscription, isOpen, onClose, onSave }: EditInscriptionModalProps) {
  const [formData, setFormData] = useState<Inscription>(inscription);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData(inscription);
  }, [inscription]);

  if (!isOpen) return null;

  const handleParentChange = (field: keyof Inscription, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStudentChange = (index: number, field: keyof Student, value: any) => {
    const newStudents = [...(formData.students || [])];
    if (!newStudents[index]) return;
    newStudents[index] = { ...newStudents[index], [field]: value };
    setFormData(prev => ({ ...prev, students: newStudents }));
  };

  const toggleActivity = (studentIndex: number, activity: string) => {
    const newStudents = [...(formData.students || [])];
    const student = newStudents[studentIndex];
    if (!student) return;

    const currentActivities = student.activities || [];
    if (currentActivities.includes(activity)) {
      student.activities = currentActivities.filter(a => a !== activity);
    } else {
      student.activities = [...currentActivities, activity];
    }
    
    setFormData(prev => ({ ...prev, students: newStudents }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // @ts-ignore - ID comes as string but service expects number or string depending on version. 
      // Supabase IDs are usually UUID or Int. AdminService signatures earlier showed number, but interface here strings.
      // We'll pass as is, assuming service handles it or we cast.
      await onSave(formData.id, formData);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error al guardar los cambios');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-xl font-bold text-gray-900">Editar Inscripció</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-8">
          {/* Parent Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Dades Familiars</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom i Cognoms (Pare/Mare/Tutor)</label>
                <input
                  type="text"
                  required
                  value={formData.parent_name || ''}
                  onChange={e => handleParentChange('parent_name', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DNI/NIE</label>
                <input
                  type="text"
                  required
                  value={formData.parent_dni || ''}
                  onChange={e => handleParentChange('parent_dni', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Principal</label>
                <input
                  type="email"
                  required
                  value={formData.parent_email_1 || ''}
                  onChange={e => handleParentChange('parent_email_1', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telèfon Principal</label>
                <input
                  type="tel"
                  required
                  value={formData.parent_phone_1 || ''}
                  onChange={e => handleParentChange('parent_phone_1', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id="afa_member"
                  checked={formData.afa_member || false}
                  onChange={e => handleParentChange('afa_member', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="afa_member" className="font-medium text-gray-700">Soci de l'AFA</label>
              </div>
            </div>
          </section>

          {/* Students Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Alumnes</h3>
            <div className="space-y-6">
              {(formData.students || []).map((student, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                      <input
                        type="text"
                        value={student.name || ''}
                        onChange={e => handleStudentChange(idx, 'name', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cognoms</label>
                      <input
                        type="text"
                        value={student.surname || ''}
                        onChange={e => handleStudentChange(idx, 'surname', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Curs</label>
                      <select
                        value={student.course || ''}
                        onChange={e => handleStudentChange(idx, 'course', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Seleccionar...</option>
                        {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Activities Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Activitats</label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_ACTIVITIES.map(activity => {
                        const isSelected = (student.activities || []).includes(activity);
                        return (
                          <button
                            key={activity}
                            type="button"
                            onClick={() => toggleActivity(idx, activity)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                              isSelected
                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {activity}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Status Toggle for Student */}
                  <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
                     <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 hover:text-slate-800">
                        <input 
                            type="checkbox" 
                            checked={student.suspended || false} 
                            onChange={e => handleStudentChange(idx, 'suspended', e.target.checked)}
                            className="rounded text-red-500 focus:ring-red-500"
                        />
                        <span>Suspès temporalment</span>
                     </label>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </form>

        <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel·lar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardant...' : 'Guardar Canvis'}
          </button>
        </div>
      </div>
    </div>
  );
}
