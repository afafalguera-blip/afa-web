import { useTranslation } from 'react-i18next';
import { Modal } from '../../common/Modal';
import type { NotificationFormData, Notification } from '../../../services/admin/AdminNotificationService';

interface NotificationFormModalProps {
  open: boolean;
  isEditing: boolean;
  formData: NotificationFormData;
  setFormData: React.Dispatch<React.SetStateAction<NotificationFormData>>;
  saving: boolean;
  nativeDateLocale: string;
  onSave: () => void;
  onClose: () => void;
}

const FIELD_CLASS =
  'w-full px-3 py-2 border border-neutral-200 rounded-md focus:ring-2 focus:ring-neutral-300 outline-none bg-white';
const LABEL_CLASS = 'block text-[13px] font-medium text-neutral-700 mb-1';

export function NotificationFormModal({
  open, isEditing, formData, setFormData, saving, nativeDateLocale, onSave, onClose
}: NotificationFormModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      title={isEditing ? t('admin.notifications.edit', 'Editar notificació') : t('admin.notifications.new', 'Nova notificació')}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-3.5 py-2 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="notification-title" className={LABEL_CLASS}>
            {t('admin.notifications.field_title', 'Títol')} *
          </label>
          <input
            id="notification-title"
            type="text"
            value={formData.title}
            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="notification-message" className={LABEL_CLASS}>
            {t('admin.notifications.field_message', 'Missatge (opcional)')}
          </label>
          <textarea
            id="notification-message"
            value={formData.message}
            onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
            className={`${FIELD_CLASS} resize-none`}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="notification-type" className={LABEL_CLASS}>
              {t('admin.notifications.field_type', 'Tipus')}
            </label>
            <select
              id="notification-type"
              value={formData.type}
              onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as Notification['type'] }))}
              className={FIELD_CLASS}
            >
              <option value="info">{t('admin.notifications.type_info', 'Informació')}</option>
              <option value="alert">{t('admin.notifications.type_alert', 'Alerta')}</option>
              <option value="news">{t('admin.notifications.type_news', 'Notícia')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="notification-link" className={LABEL_CLASS}>
              {t('admin.notifications.field_link', 'Enllaç (opcional)')}
            </label>
            <input
              id="notification-link"
              type="text"
              value={formData.link}
              onChange={e => setFormData(prev => ({ ...prev, link: e.target.value }))}
              className={FIELD_CLASS}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="notification-start" className={LABEL_CLASS}>
              {t('admin.notifications.field_start', 'Mostrar des de')} *
            </label>
            <input
              id="notification-start"
              type="datetime-local"
              lang={nativeDateLocale}
              value={formData.start_at}
              onChange={e => setFormData(prev => ({ ...prev, start_at: e.target.value }))}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label htmlFor="notification-end" className={LABEL_CLASS}>
              {t('admin.notifications.field_end', 'Mostrar fins a')}
            </label>
            <input
              id="notification-end"
              type="datetime-local"
              lang={nativeDateLocale}
              value={formData.end_at}
              onChange={e => setFormData(prev => ({ ...prev, end_at: e.target.value }))}
              className={FIELD_CLASS}
            />
            <p className="text-xs text-neutral-400 mt-1">
              {t('admin.notifications.end_hint', 'Deixa-ho buit per indefinit')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="notification-active"
            checked={formData.active}
            onChange={e => setFormData(prev => ({ ...prev, active: e.target.checked }))}
            className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400"
          />
          <label htmlFor="notification-active" className="text-[13px] font-medium text-neutral-700">
            {t('admin.status.visible', 'Publicat')}
          </label>
        </div>
      </div>
    </Modal>
  );
}
