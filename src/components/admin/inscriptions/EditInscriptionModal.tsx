import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Modal } from '../../common/Modal';
import { useDirtyGuard } from '../../../hooks/useDirtyGuard';
import { COURSES, isCourseCode } from '../../../constants/courses';
import type { Inscription, InscriptionStatus, InscriptionStudent } from '../../../types/inscription';

interface EditInscriptionModalProps {
  /** Inscription being edited; `null` keeps the modal closed. */
  inscription: Inscription | null;
  onClose: () => void;
  /** Persists the changes. Resolves true on success. */
  onSave: (id: string, updates: Partial<Inscription>) => Promise<boolean>;
  /**
   * Activity labels present in the cohort. Used instead of a hardcoded list so
   * the picker follows whatever the season actually offers.
   */
  activityOptions?: string[];
}

const STATUS_OPTIONS: InscriptionStatus[] = ['alta', 'pending', 'baja'];

const inputClass =
  'w-full px-3 py-2 rounded-md border border-neutral-300 bg-white text-[13px] text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-400 transition-colors';
const labelClass = 'block text-[12px] font-medium text-neutral-700 mb-1';

/**
 * Remounts the form whenever a different inscription is opened, so the draft
 * state is initialised from props instead of being synced by an effect.
 */
export function EditInscriptionModal(props: EditInscriptionModalProps) {
  return <EditInscriptionForm key={props.inscription?.id ?? '__closed__'} {...props} />;
}

function EditInscriptionForm({
  inscription,
  onClose,
  onSave,
  activityOptions = []
}: EditInscriptionModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<Inscription | null>(inscription);
  const [saving, setSaving] = useState(false);

  const isDirty = useMemo(
    () => Boolean(inscription && form && JSON.stringify(inscription) !== JSON.stringify(form)),
    [inscription, form]
  );
  const { confirmDiscard } = useDirtyGuard(isDirty);

  const handleClose = async () => {
    if (saving) return;
    if (await confirmDiscard()) onClose();
  };

  const setField = <K extends keyof Inscription>(field: K, value: Inscription[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const setStudentField = <K extends keyof InscriptionStudent>(
    index: number,
    field: K,
    value: InscriptionStudent[K]
  ) => {
    setForm((prev) => {
      if (!prev) return prev;
      const students = prev.students.map((student, i) =>
        i === index ? { ...student, [field]: value } : student
      );
      return { ...prev, students };
    });
  };

  const toggleActivity = (index: number, activity: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const students = prev.students.map((student, i) => {
        if (i !== index) return student;
        const current = student.activities || [];
        return {
          ...student,
          activities: current.includes(activity)
            ? current.filter((a) => a !== activity)
            : [...current, activity]
        };
      });
      return { ...prev, students };
    });
  };

  const handleSubmit = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const ok = await onSave(form.id, form);
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  /** Activity picker: cohort options plus whatever this family already has. */
  const pickerActivities = useMemo(() => {
    const set = new Set(activityOptions);
    form?.students.forEach((student) => (student.activities || []).forEach((a) => a && set.add(a)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ca'));
  }, [activityOptions, form]);

  return (
    <Modal
      open={form !== null}
      onClose={handleClose}
      size="xl"
      closeOnBackdrop={false}
      title={t('admin.inscriptions.edit_title', 'Editar inscripció')}
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            {t('common.cancel', 'Cancel·lar')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-[13px] font-medium transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('common.save', 'Desar')}
          </button>
        </>
      }
    >
      {form && (
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <section>
            <h3 className="text-[13px] font-semibold text-neutral-900 pb-2 mb-3 border-b border-neutral-200">
              {t('admin.inscriptions.details_family', 'Dades familiars')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="edit-parent-name">
                  {t('admin.inscriptions.field_parent', 'Pare/Mare/Tutor')}
                </label>
                <input
                  id="edit-parent-name"
                  className={inputClass}
                  value={form.parent_name}
                  onChange={(e) => setField('parent_name', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="edit-parent-dni">
                  {t('admin.inscriptions.field_dni', 'DNI/NIE')}
                </label>
                <input
                  id="edit-parent-dni"
                  className={inputClass}
                  value={form.parent_dni}
                  onChange={(e) => setField('parent_dni', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="edit-parent-email">
                  {t('admin.inscriptions.field_email_1', 'Email principal')}
                </label>
                <input
                  id="edit-parent-email"
                  type="email"
                  className={inputClass}
                  value={form.parent_email_1}
                  onChange={(e) => setField('parent_email_1', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="edit-parent-phone">
                  {t('admin.inscriptions.field_phone_1', 'Telèfon principal')}
                </label>
                <input
                  id="edit-parent-phone"
                  type="tel"
                  className={inputClass}
                  value={form.parent_phone_1}
                  onChange={(e) => setField('parent_phone_1', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="edit-parent-email-2">
                  {t('admin.inscriptions.field_email_2', 'Email secundari')}
                </label>
                <input
                  id="edit-parent-email-2"
                  type="email"
                  className={inputClass}
                  value={form.parent_email_2 || ''}
                  onChange={(e) => setField('parent_email_2', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="edit-parent-phone-2">
                  {t('admin.inscriptions.field_phone_2', 'Telèfon secundari')}
                </label>
                <input
                  id="edit-parent-phone-2"
                  type="tel"
                  className={inputClass}
                  value={form.parent_phone_2 || ''}
                  onChange={(e) => setField('parent_phone_2', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="edit-status">
                  {t('admin.inscriptions.table.status', 'Estat')}
                </label>
                <select
                  id="edit-status"
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value as InscriptionStatus)}
                >
                  {(STATUS_OPTIONS.includes(form.status)
                    ? STATUS_OPTIONS
                    : [form.status, ...STATUS_OPTIONS]
                  ).map((status) => (
                    <option key={status} value={status}>
                      {t(`admin.inscriptions.status.${status}`, status)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-[13px] text-neutral-700 pb-2">
                  <input
                    type="checkbox"
                    checked={form.afa_member}
                    onChange={(e) => setField('afa_member', e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900/20"
                  />
                  {t('admin.inscriptions.member_badge', 'Soci AFA')}
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="edit-pickup">
                  {t('admin.inscriptions.field_pickup', 'Autoritzats a recollir')}
                </label>
                <input
                  id="edit-pickup"
                  className={inputClass}
                  value={form.authorized_pickup || ''}
                  onChange={(e) => setField('authorized_pickup', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[13px] font-semibold text-neutral-900 pb-2 mb-3 border-b border-neutral-200">
              {t('admin.inscriptions.details_students', 'Alumnes')}
            </h3>
            <div className="space-y-4">
              {form.students.map((student, idx) => {
                // Legacy rows may hold a course code outside COURSE_CODES; keep
                // it selectable so saving never silently rewrites the value.
                const courseOptions = isCourseCode(student.course) || !student.course
                  ? COURSES.map((c) => ({ code: c.code as string, label: c.label }))
                  : [
                      { code: student.course, label: `${student.course} (llegat)` },
                      ...COURSES.map((c) => ({ code: c.code as string, label: c.label }))
                    ];

                return (
                  <div key={idx} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass} htmlFor={`student-name-${idx}`}>
                          {t('admin.inscriptions.field_student_name', 'Nom')}
                        </label>
                        <input
                          id={`student-name-${idx}`}
                          className={inputClass}
                          value={student.name || ''}
                          onChange={(e) => setStudentField(idx, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor={`student-surname-${idx}`}>
                          {t('admin.inscriptions.field_student_surname', 'Cognoms')}
                        </label>
                        <input
                          id={`student-surname-${idx}`}
                          className={inputClass}
                          value={student.surname || ''}
                          onChange={(e) => setStudentField(idx, 'surname', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor={`student-course-${idx}`}>
                          {t('admin.inscriptions.field_course', 'Curs')}
                        </label>
                        <select
                          id={`student-course-${idx}`}
                          className={inputClass}
                          value={student.course || ''}
                          onChange={(e) => setStudentField(idx, 'course', e.target.value)}
                        >
                          <option value="">{t('admin.inscriptions.select_course', 'Selecciona...')}</option>
                          {courseOptions.map((option) => (
                            <option key={option.code} value={option.code}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <span className={labelClass}>{t('admin.inscriptions.field_activities', 'Activitats')}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {pickerActivities.length === 0 && (
                          <span className="text-[12px] text-neutral-500">
                            {t('admin.inscriptions.no_activities', 'Sense activitats')}
                          </span>
                        )}
                        {pickerActivities.map((activity) => {
                          const selected = (student.activities || []).includes(activity);
                          return (
                            <button
                              key={activity}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => toggleActivity(idx, activity)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                                selected
                                  ? 'bg-neutral-900 text-white border-neutral-900'
                                  : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                              }`}
                            >
                              {activity}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-[13px] text-neutral-700">
                      <input
                        type="checkbox"
                        checked={student.suspended || false}
                        onChange={(e) => setStudentField(idx, 'suspended', e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900/20"
                      />
                      {t('admin.inscriptions.suspended_label', 'Suspès temporalment')}
                    </label>
                  </div>
                );
              })}
            </div>
          </section>
        </form>
      )}
    </Modal>
  );
}

export default EditInscriptionModal;
