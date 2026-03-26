import { Edit, Trash2, Eye, EyeOff, AlertCircle, Info, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { Notification } from '../../../services/admin/AdminNotificationService';

interface NotificationCardProps {
  notification: Notification;
  onToggleActive: (notification: Notification) => void;
  onEdit: (notification: Notification) => void;
  onDelete: (id: string) => void;
}

function getIcon(type: string) {
  switch (type) {
    case 'alert': return <AlertCircle className="w-5 h-5 text-red-500" />;
    case 'news': return <Calendar className="w-5 h-5 text-blue-500" />;
    default: return <Info className="w-5 h-5 text-slate-500" />;
  }
}

export function NotificationCard({ notification, onToggleActive, onEdit, onDelete }: NotificationCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow ${notification.active ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-75'
        }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="mt-1 p-2 bg-slate-50 rounded-lg">
            {getIcon(notification.type)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900">{notification.title}</h3>
              <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded-full ${notification.type === 'alert' ? 'bg-red-100 text-red-700' :
                  notification.type === 'news' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                }`}>
                {notification.type}
              </span>
              {!notification.active && (
                <span className="px-2 py-0.5 text-xs font-bold uppercase rounded-full bg-slate-200 text-slate-500">
                  Inactiva
                </span>
              )}
            </div>
            {notification.message && (
              <p className="text-sm text-slate-500 mb-2">{notification.message}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="font-medium">Inicio:</span>
                {format(new Date(notification.start_at), 'dd/MM/yyyy HH:mm')}
              </span>
              {notification.end_at && (
                <span className="flex items-center gap-1">
                  <span className="font-medium">Fin:</span>
                  {format(new Date(notification.end_at), 'dd/MM/yyyy HH:mm')}
                </span>
              )}
              {notification.link && (
                <span className="truncate max-w-[200px]" title={notification.link}>
                  🔗 {notification.link}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleActive(notification)}
            className={`p-2 rounded-lg transition-colors ${notification.active
                ? 'text-green-600 hover:bg-green-50'
                : 'text-slate-400 hover:bg-slate-100'
              }`}
            title={notification.active ? 'Desactivar' : 'Activar'}
          >
            {notification.active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
          <button
            onClick={() => onEdit(notification)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(notification.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
