import { useTranslation } from 'react-i18next';
import { Edit, Trash2, AlertCircle, Info, Calendar, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Notification } from '../../../services/admin/AdminNotificationService';
import { ContentStatusBadge, VisibilityToggleButton, STATUS_PILL_CLASS } from '../news/ContentStatusBadge';

interface NotificationCardProps {
  notification: Notification;
  onToggleActive: (notification: Notification) => void;
  onEdit: (notification: Notification) => void;
  onDelete: (id: string) => void;
}

function getIcon(type: string) {
  switch (type) {
    case 'alert': return <AlertCircle className="w-5 h-5 text-red-600" />;
    case 'news': return <Calendar className="w-5 h-5 text-neutral-600" />;
    default: return <Info className="w-5 h-5 text-neutral-500" />;
  }
}

export function NotificationCard({ notification, onToggleActive, onEdit, onDelete }: NotificationCardProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`bg-white rounded-lg border p-5 transition-shadow hover:shadow-sm ${
        notification.active ? 'border-neutral-200' : 'border-neutral-200 bg-neutral-50 opacity-80'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="mt-0.5 p-2 bg-neutral-50 border border-neutral-200 rounded-md shrink-0">
            {getIcon(notification.type)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <ContentStatusBadge visible={notification.active} hiddenKind="inactive" />
              <span
                className={`${STATUS_PILL_CLASS} ${
                  notification.type === 'alert'
                    ? 'bg-red-100 text-red-700'
                    : notification.type === 'news'
                      ? 'bg-sky-100 text-sky-700'
                      : 'bg-neutral-100 text-neutral-700'
                }`}
              >
                {notification.type}
              </span>
            </div>

            <h3 className="font-semibold text-[15px] text-neutral-900">{notification.title}</h3>

            {notification.message && (
              <p className="text-[13px] text-neutral-500 mt-1 mb-2">{notification.message}</p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
              <span>
                <span className="font-medium">{t('admin.notifications.field_start', 'Mostrar des de')}: </span>
                {format(new Date(notification.start_at), 'dd/MM/yyyy HH:mm')}
              </span>
              {notification.end_at && (
                <span>
                  <span className="font-medium">{t('admin.notifications.field_end', 'Mostrar fins a')}: </span>
                  {format(new Date(notification.end_at), 'dd/MM/yyyy HH:mm')}
                </span>
              )}
              {notification.link && (
                <span className="inline-flex items-center gap-1 truncate max-w-[220px]" title={notification.link}>
                  <Link2 className="w-3 h-3" aria-hidden="true" />
                  {notification.link}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <VisibilityToggleButton
            visible={notification.active}
            hiddenKind="inactive"
            onToggle={() => onToggleActive(notification)}
          />
          <button
            type="button"
            onClick={() => onEdit(notification)}
            className="p-2 rounded-md text-neutral-600 hover:bg-neutral-100 transition-colors"
            title={t('common.edit')}
            aria-label={t('common.edit')}
          >
            <Edit className="w-[18px] h-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(notification.id)}
            className="p-2 rounded-md text-red-600 hover:bg-red-50 transition-colors"
            title={t('common.delete')}
            aria-label={t('common.delete')}
          >
            <Trash2 className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
