import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Save, Loader2, Plus, Trash2, X } from "lucide-react";
import { ActivityService } from "../../services/ActivityService";
import type { Activity } from "../../services/ActivityService";
import { Modal } from "../common/Modal";
import { useToast } from "../common/Toast";
import { useDirtyGuard } from "../../hooks/useDirtyGuard";

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
  important_note: "",
  inscription_course_types: [],
  inscription_enabled: false,
};

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/10";

const LANGS: { code: 'es' | 'ca' | 'en'; label: string }[] = [
  { code: 'es', label: 'Español' },
  { code: 'ca', label: 'Català' },
  { code: 'en', label: 'English' },
];

/**
 * Mounted only while open (see ActivitiesManager) so the form state resets
 * naturally instead of being re-synced from props in an effect.
 */
export function ActivityEditorModal({ isOpen, onClose, activity, onSaved }: ActivityEditorModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const initial = activity ?? DEFAULT_ACTIVITY;
  const [formData, setFormData] = useState<Partial<Activity>>(initial);
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(initial));
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(activity?.image_url ?? "");
  const [currentLang, setCurrentLang] = useState<'es' | 'ca' | 'en'>('es');

  const isDirty = isOpen && (JSON.stringify(formData) !== baseline || !!imageFile);
  const { confirmDiscard } = useDirtyGuard(isDirty);

  const requestClose = async () => {
    if (!(await confirmDiscard())) return;
    onClose();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleChange = <K extends keyof Activity>(field: K, value: Activity[K]) => {
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
    const val = formData[langKey as keyof typeof formData];
    if (val !== undefined && val !== null) return String(val);

    return currentLang === 'es' && formData[field] ? String(formData[field]) : '';
  };

  // Schedule Details Handler
  const addScheduleGroup = () => {
    const current = formData.schedule_details || [];
    setFormData(prev => ({
      ...prev,
      schedule_details: [...current, { group: t('admin.editor.new_group', 'Nou grup'), sessions: [] }]
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

  const updateSession = (groupIndex: number, sessionIndex: number, field: 'day' | 'startTime' | 'endTime', value: string | number) => {
    const current = [...(formData.schedule_details || [])];
    const session = { ...current[groupIndex].sessions[sessionIndex] };

    if (field === 'day') {
      session.day = typeof value === 'string' ? parseInt(value) : value;
    } else {
      session[field] = String(value);
    }

    current[groupIndex].sessions[sessionIndex] = session;
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
      setBaseline(JSON.stringify(formData));
      setImageFile(null);
      toast.success(t('admin.activities.saved', 'Activitat desada'));
      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to save activity", error);
      toast.error(t('common.error_save'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={requestClose}
      title={activity ? t('admin.editor.edit_title') : t('admin.editor.new_title')}
      size="xl"
      closeOnBackdrop={false}
      footer={
        <>
          <button
            type="button"
            onClick={requestClose}
            className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            {t('admin.editor.cancel')}
          </button>
          <button
            type="submit"
            form="activity-form"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('admin.editor.save')}
          </button>
        </>
      }
    >
      {/* Language Tabs */}
      <div className="flex gap-2 mb-6 border-b border-neutral-200 pb-1">
        {LANGS.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => setCurrentLang(code)}
            aria-pressed={currentLang === code}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${
              currentLang === code
                ? 'bg-neutral-100 text-neutral-900 border-b-2 border-neutral-900'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form id="activity-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Main Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="activity-title" className="text-sm font-medium text-neutral-700">
              {t('admin.editor.title')} ({currentLang.toUpperCase()})
            </label>
            <input
              id="activity-title"
              required={currentLang === 'es'}
              className={INPUT_CLASS}
              value={getValue('title')}
              onChange={e => handleChange('title', e.target.value)}
              placeholder={currentLang !== 'es' ? t('admin.editor.optional_lang', '(Opcional) Deixa-ho buit per usar el valor per defecte') : ''}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="activity-category" className="text-sm font-medium text-neutral-700">{t('admin.editor.category')}</label>
            <select
              id="activity-category"
              className={INPUT_CLASS}
              value={formData.category}
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
          <label htmlFor="activity-description" className="text-sm font-medium text-neutral-700">
            {t('admin.editor.description')} ({currentLang.toUpperCase()})
          </label>
          <textarea
            id="activity-description"
            rows={3}
            className={INPUT_CLASS}
            value={getValue('description')}
            onChange={e => handleChange('description', e.target.value)}
          />
        </div>

        {/* Pricing & Logistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label htmlFor="activity-price-member" className="text-sm font-medium text-neutral-700">{t('admin.editor.price_member')}</label>
            <input
              id="activity-price-member"
              type="number"
              className={INPUT_CLASS}
              value={formData.price_member ?? 0}
              onChange={e => handleChange('price_member', parseFloat(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="activity-price-non-member" className="text-sm font-medium text-neutral-700">{t('admin.editor.price_non_member')}</label>
            <input
              id="activity-price-non-member"
              type="number"
              className={INPUT_CLASS}
              value={formData.price_non_member ?? 0}
              onChange={e => handleChange('price_non_member', parseFloat(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="activity-price-unit" className="text-sm font-medium text-neutral-700">{t('admin.editor.price_unit')}</label>
            <input
              id="activity-price-unit"
              className={INPUT_CLASS}
              value={formData.price_info ?? ''}
              onChange={e => handleChange('price_info', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="activity-spots" className="text-sm font-medium text-neutral-700">{t('admin.editor.spots')}</label>
            <input
              id="activity-spots"
              type="number"
              className={INPUT_CLASS}
              value={formData.spots ?? 0}
              onChange={e => handleChange('spots', parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-neutral-700 block">{t('admin.editor.image')}</span>
          <div className="flex gap-4 items-start">
            <div className="w-32 h-20 bg-neutral-100 rounded-lg overflow-hidden border border-neutral-300 flex items-center justify-center">
              {imagePreview ? (
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-neutral-400">{t('admin.editor.no_image', 'Sense imatge')}</span>
              )}
            </div>
            <div className="flex-1">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors text-sm font-medium">
                <Upload className="w-4 h-4" /> {t('admin.editor.upload_image')}
                <input type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
              </label>
              <p className="text-xs text-neutral-500 mt-2">{t('admin.editor.image_hint')}</p>
            </div>
          </div>
        </div>

        {/* Schedule Details (Structured Session Editor) */}
        <div className="space-y-4 bg-neutral-50 p-6 rounded-lg border border-neutral-200">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="font-bold text-neutral-900">{t('admin.editor.schedule_title')}</h3>
              <p className="text-xs text-neutral-500">{t('admin.editor.schedule_subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={addScheduleGroup}
              className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> {t('admin.editor.add_group')}
            </button>
          </div>

          <div className="space-y-6">
            {formData.schedule_details?.map((group, gIdx) => (
              <div key={gIdx} className="bg-white p-4 rounded-lg border border-neutral-200 space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    className="flex-1 px-3 py-1.5 font-bold text-neutral-800 border-b-2 border-transparent focus:border-neutral-900 bg-transparent outline-none"
                    value={group.group}
                    onChange={e => updateGroupName(gIdx, e.target.value)}
                    placeholder={t('admin.editor.group_placeholder')}
                    aria-label={t('admin.editor.group_placeholder')}
                  />
                  <button
                    type="button"
                    onClick={() => removeScheduleGroup(gIdx)}
                    aria-label={t('common.delete')}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {group.sessions?.map((session, sIdx) => (
                    <div key={sIdx} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                      <select
                        className="flex-1 min-w-[120px] p-1.5 text-sm border border-neutral-300 rounded bg-white"
                        value={session.day}
                        onChange={e => updateSession(gIdx, sIdx, 'day', e.target.value)}
                        aria-label={t('admin.editor.schedule_title')}
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
                          className="p-1.5 text-sm border border-neutral-300 rounded bg-white"
                          value={session.startTime}
                          onChange={e => updateSession(gIdx, sIdx, 'startTime', e.target.value)}
                        />
                        <span className="text-neutral-400">–</span>
                        <input
                          type="time"
                          className="p-1.5 text-sm border border-neutral-300 rounded bg-white"
                          value={session.endTime}
                          onChange={e => updateSession(gIdx, sIdx, 'endTime', e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSession(gIdx, sIdx)}
                        aria-label={t('common.delete')}
                        className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addSession(gIdx)}
                    className="w-full py-2 border-2 border-dashed border-neutral-200 rounded-lg text-xs font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    <Plus className="w-3 h-3" /> {t('admin.editor.add_session')}
                  </button>
                </div>
              </div>
            ))}
            {(!formData.schedule_details || formData.schedule_details.length === 0) && (
              <div className="text-center py-8 bg-neutral-100/50 rounded-lg border-2 border-dashed border-neutral-200">
                <p className="text-sm text-neutral-500 italic">{t('admin.editor.no_schedule')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Extra Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="activity-grades" className="text-sm font-medium text-neutral-700">
              {t('admin.editor.grades')} ({currentLang.toUpperCase()})
            </label>
            <input id="activity-grades" className={INPUT_CLASS} value={getValue('grades')} onChange={e => handleChange('grades', e.target.value)} placeholder="3r - 6è" />
          </div>
          <div className="space-y-2">
            <label htmlFor="activity-place" className="text-sm font-medium text-neutral-700">{t('admin.editor.place')}</label>
            <input id="activity-place" className={INPUT_CLASS} value={formData.place ?? ''} onChange={e => handleChange('place', e.target.value)} placeholder="Gimnàs" />
          </div>
          <div className="space-y-2">
            <label htmlFor="activity-color" className="text-sm font-medium text-neutral-700">{t('admin.editor.color')}</label>
            <input id="activity-color" className={INPUT_CLASS} value={formData.color ?? ''} onChange={e => handleChange('color', e.target.value)} placeholder="bg-blue-500" />
          </div>
          <div className="space-y-2">
            <label htmlFor="activity-icon" className="text-sm font-medium text-neutral-700">{t('admin.editor.icon')}</label>
            <input id="activity-icon" className={INPUT_CLASS} value={formData.category_icon ?? ''} onChange={e => handleChange('category_icon', e.target.value)} placeholder="school" />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="activity-note" className="text-sm font-medium text-neutral-700">
            {t('inscription.activity_modal.note_label')} ({currentLang.toUpperCase()})
          </label>
          <textarea
            id="activity-note"
            rows={2}
            className={INPUT_CLASS}
            value={getValue('important_note')}
            onChange={e => handleChange('important_note', e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="stem"
            checked={formData.is_stem_approved ?? false}
            onChange={e => handleChange('is_stem_approved', e.target.checked)}
            className="w-4 h-4 text-neutral-900 rounded border-neutral-300 focus:ring-neutral-900"
          />
          <label htmlFor="stem" className="text-sm text-neutral-700">{t('admin.editor.stem')}</label>
        </div>

        {/* Inscription Form Config */}
        <div className="border-t border-neutral-200 pt-4 mt-2">
          <h4 className="text-sm font-bold text-neutral-800 mb-3">
            {t('admin.editor.inscription_section', "Formulari d'inscripció")}
          </h4>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="inscription_enabled"
              checked={formData.inscription_enabled || false}
              onChange={e => handleChange('inscription_enabled', e.target.checked)}
              className="w-4 h-4 text-neutral-900 rounded border-neutral-300 focus:ring-neutral-900"
            />
            <label htmlFor="inscription_enabled" className="text-sm text-neutral-700">
              {t('admin.editor.inscription_enabled', "Disponible al formulari d'inscripció")}
            </label>
          </div>
          {formData.inscription_enabled && (
            <div>
              <span className="text-sm font-medium text-neutral-700 mb-2 block">
                {t('admin.editor.course_groups', 'Grups de cursos assignats')}
              </span>
              <div className="flex flex-wrap gap-3">
                {(['infantil', 'primaria1', 'primaria2'] as const).map(ct => (
                  <label key={ct} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData.inscription_course_types || []).includes(ct)}
                      onChange={e => {
                        const current = formData.inscription_course_types || [];
                        const next = e.target.checked
                          ? [...current, ct]
                          : current.filter(c => c !== ct);
                        handleChange('inscription_course_types', next);
                      }}
                      className="w-4 h-4 text-neutral-900 rounded border-neutral-300 focus:ring-neutral-900"
                    />
                    <span className="text-sm text-neutral-600">
                      {ct === 'infantil'
                        ? t('admin.editor.group_infantil', 'Infantil (I3-I5)')
                        : ct === 'primaria1'
                          ? t('admin.editor.group_primaria1', 'Primària 1r-3r')
                          : t('admin.editor.group_primaria2', 'Primària 4t-6è')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
