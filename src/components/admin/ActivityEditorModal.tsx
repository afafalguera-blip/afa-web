import { useState, useEffect } from "react";
import { ActivityService } from "../../services/ActivityService";
import type { Activity } from "../../services/ActivityService";
import { X, Upload, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

interface ActivityEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity?: Activity | null;
  onSaved: () => void;
}

const DEFAULT_ACTIVITY: Partial<Activity> = {
  title: "",
  category: "Educatiu",
  description: "",
  price: 0,
  price_info: "/mes",
  grades: "",
  schedule_summary: "",
  place: "",
  spots: 10,
  image_url: "",
  color: "bg-blue-500",
  category_icon: "school",
  is_stem_approved: false,
  schedule_details: [],
  important_note: ""
};

export function ActivityEditorModal({ isOpen, onClose, activity, onSaved }: ActivityEditorModalProps) {
  const [formData, setFormData] = useState<Partial<Activity>>(DEFAULT_ACTIVITY);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  useEffect(() => {
    if (activity) {
      setFormData(activity);
      setImagePreview(activity.image_url);
    } else {
        setFormData(DEFAULT_ACTIVITY);
        setImagePreview("");
    }
  }, [activity, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleChange = (field: keyof Activity, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Schedule Details Handler
  const addScheduleDetail = () => {
    const current = formData.schedule_details || [];
    setFormData(prev => ({
        ...prev,
        schedule_details: [...current, { group: "Grup A", days: "Dilluns", time: "17:00 - 18:00" }]
    }));
  };

  const updateScheduleDetail = (index: number, field: string, val: string) => {
    const current = [...(formData.schedule_details || [])];
    current[index] = { ...current[index], [field]: val };
    setFormData(prev => ({ ...prev, schedule_details: current }));
  };

  const removeScheduleDetail = (index: number) => {
    const current = [...(formData.schedule_details || [])];
    current.splice(index, 1);
    setFormData(prev => ({ ...prev, schedule_details: current }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let url = formData.image_url;
      if (imageFile) {
        url = await ActivityService.uploadImage(imageFile);
      }

      const payload = { ...formData, image_url: url } as Omit<Activity, 'id' | 'created_at'>;

      if (activity?.id) {
        await ActivityService.update(activity.id, payload);
      } else {
        await ActivityService.create(payload);
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to save activity", error);
      alert("Error saving activity");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold dark:text-white">
            {activity ? "Editar Activitat" : "Nova Activitat"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="activity-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Main Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Títol</label>
                <input 
                  required 
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={formData.title} 
                  onChange={e => handleChange('title', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Categoria</label>
                <select 
                   className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                   value={formData.category}
                   onChange={e => handleChange('category', e.target.value)}
                >
                    <option value="Educatiu">Educatiu</option>
                    <option value="Artística">Artística</option>
                    <option value="Idiomes">Idiomes</option>
                    <option value="Música">Música</option>
                    <option value="Esports">Esports</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
               <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Descripció</label>
               <textarea 
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={formData.description} 
                  onChange={e => handleChange('description', e.target.value)}
                />
            </div>

            {/* Pricing & Logistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Preu (€)</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={formData.price} 
                    onChange={e => handleChange('price', parseFloat(e.target.value))}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Unitat Preu</label>
                  <input 
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={formData.price_info} 
                    onChange={e => handleChange('price_info', e.target.value)}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Places</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={formData.spots} 
                    onChange={e => handleChange('spots', parseInt(e.target.value))}
                  />
               </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Imatge Portada</label>
              <div className="flex gap-4 items-start">
                  <div className="w-32 h-20 bg-slate-100 rounded-lg overflow-hidden border border-slate-300 flex items-center justify-center">
                    {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-xs text-slate-400">No Image</span>
                    )}
                  </div>
                  <div className="flex-1">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors text-sm font-medium">
                          <Upload className="w-4 h-4" /> Pujar Imatge
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                      </label>
                      <p className="text-xs text-slate-500 mt-2">Recomanat: 1000x600px, Max 2MB.</p>
                  </div>
              </div>
            </div>

            {/* Schedule Details (JSON Editor UI) */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Horaris Detallats</label>
                    <button type="button" onClick={addScheduleDetail} className="text-xs flex items-center gap-1 text-blue-600 font-bold hover:underline">
                        <Plus className="w-3 h-3" /> Afegir Grup
                    </button>
                </div>
                {formData.schedule_details?.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                        <input className="w-1/3 p-2 text-sm border rounded" value={item.group} onChange={e => updateScheduleDetail(idx, 'group', e.target.value)} placeholder="Nom Grup" />
                        <input className="w-1/3 p-2 text-sm border rounded" value={item.days} onChange={e => updateScheduleDetail(idx, 'days', e.target.value)} placeholder="Dies" />
                        <input className="w-1/3 p-2 text-sm border rounded" value={item.time} onChange={e => updateScheduleDetail(idx, 'time', e.target.value)} placeholder="Hores" />
                        <button type="button" onClick={() => removeScheduleDetail(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                ))}
                {formData.schedule_details?.length === 0 && <p className="text-xs text-slate-500 italic">Cap horari definit.</p>}
            </div>

             {/* Extra Fields */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cursos</label>
                    <input className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white" value={formData.grades} onChange={e => handleChange('grades', e.target.value)} placeholder="Ex: 3r - 6è" />
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Lloc</label>
                    <input className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white" value={formData.place} onChange={e => handleChange('place', e.target.value)} placeholder="Ex: Gimnàs" />
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Color (Tailwind)</label>
                    <input className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white" value={formData.color} onChange={e => handleChange('color', e.target.value)} placeholder="Ex: bg-blue-500" />
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Icona (Material Symbols)</label>
                    <input className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white" value={formData.category_icon} onChange={e => handleChange('category_icon', e.target.value)} placeholder="Ex: school" />
                </div>
            </div>
            
             <div className="flex items-center gap-2">
                <input type="checkbox" id="stem" checked={formData.is_stem_approved} onChange={e => handleChange('is_stem_approved', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                <label htmlFor="stem" className="text-sm text-slate-700 dark:text-slate-300">STEM Approved</label>
             </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">Cancel·lar</button>
            <button 
                form="activity-form"
                disabled={loading}
                className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar Canvis
            </button>
        </div>

      </motion.div>
    </div>
  );
}
