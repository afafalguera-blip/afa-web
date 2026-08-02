import { useTranslation } from 'react-i18next';
import { Modal } from '../../common/Modal';
import { COURSE_BY_CODE, isCourseCode } from '../../../constants/courses';
import type { Inscription } from '../../../types/inscription';

interface InscriptionDetailsModalProps {
  /** Inscription to display; `null` keeps the modal closed. */
  inscription: Inscription | null;
  onClose: () => void;
  /** Labels of the configurable custom questions, keyed by question key. */
  customLabels?: Record<string, string>;
}

const courseLabel = (code?: string): string =>
  code && isCourseCode(code) ? COURSE_BY_CODE[code].label : code || '—';

function formatDate(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ca-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="block text-[11px] font-medium uppercase tracking-wide text-neutral-500">{label}</span>
      <p className="text-[13px] text-neutral-900 break-words">{value}</p>
    </div>
  );
}

export function InscriptionDetailsModal({
  inscription,
  onClose,
  customLabels = {}
}: InscriptionDetailsModalProps) {
  const { t } = useTranslation();

  const yesNo = (value?: boolean | null) =>
    value == null ? '—' : value ? t('common.yes', 'Sí') : t('common.no', 'No');

  return (
    <Modal
      open={inscription !== null}
      onClose={onClose}
      size="lg"
      title={t('admin.inscriptions.details_title', 'Detalls de la inscripció')}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          {t('common.close', 'Tancar')}
        </button>
      }
    >
      {inscription && (
        <div className="space-y-6">
          <section>
            <h3 className="text-[13px] font-semibold text-neutral-900 pb-2 mb-3 border-b border-neutral-200">
              {t('admin.inscriptions.details_family', 'Dades familiars')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('admin.inscriptions.field_parent', 'Pare/Mare/Tutor')} value={inscription.parent_name || '—'} />
              <Field label={t('admin.inscriptions.field_dni', 'DNI/NIE')} value={inscription.parent_dni || '—'} />
              <Field label={t('admin.inscriptions.field_email_1', 'Email principal')} value={inscription.parent_email_1 || '—'} />
              <Field label={t('admin.inscriptions.field_phone_1', 'Telèfon principal')} value={inscription.parent_phone_1 || '—'} />
              {inscription.parent_email_2 && (
                <Field label={t('admin.inscriptions.field_email_2', 'Email secundari')} value={inscription.parent_email_2} />
              )}
              {inscription.parent_phone_2 && (
                <Field label={t('admin.inscriptions.field_phone_2', 'Telèfon secundari')} value={inscription.parent_phone_2} />
              )}
              <Field label={t('admin.inscriptions.member_badge', 'Soci AFA')} value={yesNo(inscription.afa_member)} />
              <Field
                label={t('admin.inscriptions.field_pickup', 'Autoritzats a recollir')}
                value={inscription.authorized_pickup?.trim() || '—'}
              />
            </div>
          </section>

          <section>
            <h3 className="text-[13px] font-semibold text-neutral-900 pb-2 mb-3 border-b border-neutral-200">
              {t('admin.inscriptions.details_students', 'Alumnes')}
            </h3>
            <div className="space-y-3">
              {inscription.students.length === 0 && (
                <p className="text-[13px] text-neutral-500">{t('admin.inscriptions.no_students', 'Sense alumnes')}</p>
              )}
              {inscription.students.map((student, idx) => (
                <div key={idx} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-neutral-900">
                      {student.name} {student.surname}
                    </span>
                    <span className="text-[12px] text-neutral-500">{courseLabel(student.course)}</span>
                    {student.suspended && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">
                        {t('admin.inscriptions.suspended_badge', 'Suspès')}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(student.activities || []).length === 0 && (
                      <span className="text-[12px] text-neutral-500">
                        {t('admin.inscriptions.no_activities', 'Sense activitats')}
                      </span>
                    )}
                    {(student.activities || []).map((activity) => (
                      <span
                        key={activity}
                        className="px-2 py-0.5 rounded border border-neutral-200 bg-white text-[11px] text-neutral-700"
                      >
                        {activity}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field
                      label={t('admin.inscriptions.field_school', 'Escola')}
                      value={
                        student.is_falguera === false
                          ? student.external_school?.trim() ||
                            t('admin.inscriptions.external_school_unknown', 'Extern (sense especificar)')
                          : 'Escola Falguera'
                      }
                    />
                    <Field
                      label={t('admin.inscriptions.field_health', 'Salut / Al·lèrgies')}
                      value={student.health_info?.trim() || '—'}
                    />
                    <Field
                      label={t('admin.inscriptions.field_image_auth', "Autorització d'imatge")}
                      value={
                        student.image_auth_consent == null
                          ? '—'
                          : student.image_auth_consent === 'si'
                            ? t('common.yes', 'Sí')
                            : t('common.no', 'No')
                      }
                    />
                    <Field
                      label={t('admin.inscriptions.field_leave_alone', 'Pot marxar sol/a')}
                      value={yesNo(student.can_leave_alone)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {inscription.extra_answers && Object.keys(inscription.extra_answers).length > 0 && (
            <section>
              <h3 className="text-[13px] font-semibold text-neutral-900 pb-2 mb-3 border-b border-neutral-200">
                {t('admin.inscriptions.details_extra', 'Preguntes addicionals')}
              </h3>
              <div className="space-y-2">
                {Object.entries(inscription.extra_answers)
                  .filter(([, value]) => value)
                  .map(([key, value]) => (
                    <Field key={key} label={customLabels[key] || key} value={String(value)} />
                  ))}
              </div>
            </section>
          )}

          <section className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field
              label={t('admin.inscriptions.field_created_at', 'Data inscripció')}
              value={formatDate(inscription.created_at)}
            />
            <Field
              label={t('admin.inscriptions.field_academic_year', 'Curs escolar')}
              value={inscription.academic_year || '—'}
            />
            <Field label={t('admin.inscriptions.field_id', 'ID')} value={`#${inscription.id}`} />
          </section>
        </div>
      )}
    </Modal>
  );
}

export default InscriptionDetailsModal;
