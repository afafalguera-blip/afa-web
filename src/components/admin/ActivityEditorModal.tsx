import { useState, useEffect } from "react";
import { ActivityService } from "../../services/ActivityService";
import type { Activity } from "../../services/ActivityService";
import { useTranslation } from "react-i18next";
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
  category: "educational",
  description: "",
  price: 0,
  price_member: 0,
  price_non_member: 0,
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
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<Activity>>(DEFAULT_ACTIVITY);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [currentLang, setCurrentLang] = useState<'es' | 'ca' | 'en'>('es');

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
    // If it's a translatable field, update the specific language field
    const translatableFields = ['title', 'description', 'grades', 'schedule_summary', 'important_note'];
    
    if (translatableFields.includes(field)) {
        const langKey = `${field}_${currentLang}` as keyof Activity;
        setFormData(prev => ({ 
            ...prev, 
            [langKey]: value,
            // If editing Spanish, also update the legacy field for backward compatibility
            ...(currentLang === 'es' ? { [field]: value } : {})
        }));
    } else {
        setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const getValue = (field: keyof Activity): string => {
      const langKey = `${field}_${currentLang}` as keyof Activity;
      // @ts-ignore
      const val = formData[langKey];
      if (val !== undefined && val !== null) return String(val);
      
      return currentLang === 'es' && formData[field] ? String(formData[field]) : '';
  };

  // Schedule Details Handler
  const addScheduleGroup = () => {
    const current = formData.schedule_details || [];
    setFormData(prev => ({
        ...prev,
        schedule_details: [...current, { group: "Nou Grup", sessions: [] }]
    }));
  };

  const updateGroupName = (index: number, name: string) => {
    const current = [...(formData.schedule_details || [])];
    current[index] = { ...current[index], group: name };
    setFormData(prev => ({ ...prev, schedule_details: current }));
  };

  const removeScheduleGroup = (index: number) => {
    const current = [...(formData.schedule_details || [])];
    current.splice(index, 1);
    setFormData(prev => ({ ...prev, schedule_details: current }));
  };

  const addSession = (groupIndex: number) => {
    const current = [...(formData.schedule_details || [])];
    current[groupIndex].sessions = [
        ...current[groupIndex].sessions, 
        { day: 1, startTime: "17:00", endTime: "18:30" }
    ];
    setFormData(prev => ({ ...prev, schedule_details: current }));
  };

  const updateSession = (groupIndex: number, sessionIndex: number, field: string, value: any) => {
    const current = [...(formData.schedule_details || [])];
    current[groupIndex].sessions[sessionIndex] = { 
        ...current[groupIndex].sessions[sessionIndex], 
        [field]: field === 'day' ? parseInt(value) : value 
    };
    setFormData(prev => ({ ...prev, schedule_details: current }));
  };

  const removeSession = (groupIndex: number, sessionIndex: number) => {
    const current = [...(formData.schedule_details || [])];
    current[groupIndex].sessions.splice(sessionIndex, 1);
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
      alert(t('common.error_save'));
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
            {activity ? t('admin.editor.edit_title') : t('admin.editor.new_title')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Language Tabs */}
          <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700 pb-1">
             <button 
                type="button"
                onClick={() => setCurrentLang('es')}
                className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${currentLang === 'es' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
             >
                🇪🇸 Español
             </button>
             <button 
                type="button"
                onClick={() => setCurrentLang('ca')}
                className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${currentLang === 'ca' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
             >
                🏴 Català
             </button>
             <button 
                type="button"
                onClick={() => setCurrentLang('en')}
                className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${currentLang === 'en' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
             >
                🇬🇧 English
             </button>
          </div>

          <form id="activity-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Main Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.editor.title')} ({currentLang.toUpperCase()})</label>
                <input 
                  required={currentLang === 'es'} 
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={getValue('title')} 
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder={currentLang !== 'es' ? '(Optional) Leave empty to use default' : ''}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.editor.category')}</label>
                <select 
                   className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                   value={formData.category} // Category is universal
                   onChange={e => handleChange('category', e.target.value)}
                >
                    <option value="educational">{t('admin.editor.categories.educational')}</option>
                    <option value="artistic">{t('admin.editor.categories.artistic')}</option>
                    <option value="languages">{t('admin.editor.categories.languages')}</option>
                    <option value="music">{t('admin.editor.categories.music')}</option>
                    <option value="sports">{t('admin.editor.categories.sports')}</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
               <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.editor.description')} ({currentLang.toUpperCase()})</label>
               <textarea 
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={getValue('description')} 
                  onChange={e => handleChange('description', e.target.value)}
                />
            </div>

            {/* Pricing & Logistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.editor.price_member' as any)}</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={formData.price_member ?? 0} 
                    onChange={e => handleChange('price_member', parseFloat(e.target.value))}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.editor.price_non_member' as any)}</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={formData.price_non_member ?? 0} 
                    onChange={e => handleChange('price_non_member', parseFloat(e.target.value))}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.editor.price_unit')}</label>
                  <input 
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={formData.price_info ?? ''} 
                    onChange={e => handleChange('price_info', e.target.value)}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.editor.spots')}</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={formData.spots ?? 0} 
                    onChange={e => handleChange('spots', parseInt(e.target.value))}
                  />
               </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.editor.image')}</label>
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
                          <Upload className="w-4 h-4" /> {t('admin.editor.upload_image')}
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                      </label>
                      <p className="text-xs text-slate-500 mt-2">{t('admin.editor.image_hint')}</p>
                  </div>
              </div>
            </div>

            {/* Schedule Details (Structured Session Editor) */}
            <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">{t('admin.editor.schedule_title')}</h3>
                        <p className="text-xs text-slate-500">{t('admin.editor.schedule_subtitle')}</p>
                    </div>
                    <button type="button" onClick={addScheduleGroup} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-bold">
                        <Plus className="w-4 h-4" /> {t('admin.editor.add_group')}
                    </button>
                </div>

                <div className="space-y-6">
                    {formData.schedule_details?.map((group: any, gIdx: number) => (
                        <div key={gIdx} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                            <div className="flex items-center gap-4">
                                <input 
                                    className="flex-1 px-3 py-1.5 font-bold text-slate-800 dark:text-white border-b-2 border-transparent focus:border-blue-500 bg-transparent outline-none"
                                    value={group.group} 
                                    onChange={e => updateGroupName(gIdx, e.target.value)} 
                                    placeholder={t('admin.editor.group_placeholder')} 
                                />
                              <button type="button" onClick={() => removeScheduleGroup(gIdx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                {group.sessions?.map((session: any, sIdx: number) => (
                                    <div key={sIdx} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <select 
                                            className="flex-1 min-w-[120px] p-1.5 text-sm border rounded bg-white dark:bg-slate-900 dark:text-white"
                                            value={session.day}
                                            onChange={e => updateSession(gIdx, sIdx, 'day', e.target.value)}
                                        >
                                            <option value={1}>{t('admin.editor.days.mon')}</option>
                                            <option value={2}>{t('admin.editor.days.tue')}</option>
                                            <option value={3}>{t('admin.editor.days.wed')}</option>
                                            <option value={4}>{t('admin.editor.days.thu')}</option>
                                            <option value={5}>{t('admin.editor.days.fri')}</option>
                                            <option value={6}>{t('admin.editor.days.sat')}</option>
                                        </select>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="time" 
                                                className="p-1.5 text-sm border rounded bg-white dark:bg-slate-900 dark:text-white"
                                                value={session.startTime}
                                                onChange={e => updateSession(gIdx, sIdx, 'startTime', e.target.value)}
                                            />
                                            <span className="text-slate-400">a</span>
                                            <input 
                                                type="time" 
                                                className="p-1.5 text-sm border rounded bg-white dark:bg-slate-900 dark:text-white"
                                                value={session.endTime}
                                                onChange={e => updateSession(gIdx, sIdx, 'endTime', e.target.value)}
                                            />
                                        </div>
                                        <button type="button" onClick={() => removeSession(gIdx, sIdx)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addSession(gIdx)} className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2 mt-2">
                                    <Plus className="w-3 h-3" /> {t('admin.editor.add_session')}
                                </button>
                            </div>
                        </div>
                    ))}
                    {(!formData.schedule_details || formData.schedule_details.length === 0) && (
                        <div className="text-center py-8 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <p className="text-sm text-slate-500 italic">{t('admin.editor.no_schedule')}</p>
                        </div>
                    )}
                </div>
            </div>

             {/* Extra Fields */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.editor.grades')} ({currentLang.toUpperCase()})</label>
                    <input className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white" value={getValue('grades')} onChange={e => handleChange('grades', e.target.value)} placeholder="Ex: 3r - 6è" />
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.editor.place')}</label>
                    <input className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white" value={formData.place} onChange={e => handleChange('place', e.target.value)} placeholder="Ex: Gimnàs" />
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.editor.color')}</label>
                    <input className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white" value={formData.color} onChange={e => handleChange('color', e.target.value)} placeholder="Ex: bg-blue-500" />
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.editor.icon')}</label>
                    <input className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white" value={formData.category_icon} onChange={e => handleChange('category_icon', e.target.value)} placeholder="Ex: school" />
                </div>
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('inscription.activity_modal.note_label')} ({currentLang.toUpperCase()})</label>
                <textarea 
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={getValue('important_note')} 
                  onChange={e => handleChange('important_note', e.target.value)}
                  placeholder="Important note..."
                />
            </div>
            
             <div className="flex items-center gap-2">
                <input type="checkbox" id="stem" checked={formData.is_stem_approved} onChange={e => handleChange('is_stem_approved', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                <label htmlFor="stem" className="text-sm text-slate-700 dark:text-slate-300">{t('admin.editor.stem')}</label>
             </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">{t('admin.editor.cancel')}</button>
            <button 
                form="activity-form"
                disabled={loading}
                className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('admin.editor.save')}
            </button>
        </div>

      </motion.div>
    </div>
  );
}
