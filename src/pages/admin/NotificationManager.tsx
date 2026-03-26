import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { getRegionalLanguageTag } from '../../utils/locale';
import { AdminNotificationService } from '../../services/admin/AdminNotificationService';
import type { Notification, NotificationFormData } from '../../services/admin/AdminNotificationService';
import { NotificationHeader } from '../../components/admin/notifications/NotificationHeader';
import { NotificationFilters } from '../../components/admin/notifications/NotificationFilters';
import { NotificationCard } from '../../components/admin/notifications/NotificationCard';
import { NotificationFormModal } from '../../components/admin/notifications/NotificationFormModal';

const EMPTY_FORM: NotificationFormData = {
  title: '',
  message: '',
  type: 'info',
  link: '',
  start_at: '',
  end_at: '',
  active: true
};

export default function NotificationManager() {
  const nativeDateLocale = getRegionalLanguageTag(
    typeof document !== 'undefined' ? document.documentElement.lang : undefined
  );

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | Notification['type']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NotificationFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await AdminNotificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      alert('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData({
      ...EMPTY_FORM,
      start_at: new Date().toISOString().slice(0, 16)
    });
    setIsModalOpen(true);
  };

  const handleEdit = (notification: Notification) => {
    setEditingId(notification.id);
    setFormData({
      title: notification.title,
      message: notification.message || '',
      type: notification.type,
      link: notification.link || '',
      start_at: new Date(notification.start_at).toISOString().slice(0, 16),
      end_at: notification.end_at ? new Date(notification.end_at).toISOString().slice(0, 16) : '',
      active: notification.active
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta notificación?')) return;
    try {
      await AdminNotificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error al eliminar');
    }
  };

  const handleToggleActive = async (notification: Notification) => {
    const newActive = !notification.active;
    try {
      await AdminNotificationService.toggleActive(notification.id, newActive);
      setNotifications(prev => prev.map(n =>
        n.id === notification.id ? { ...n, active: newActive } : n
      ));
    } catch (error) {
      console.error('Error toggling active:', error);
      alert('Error al actualizar estado');
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('El título es obligatorio');
      return;
    }
    setSaving(true);
    try {
      await AdminNotificationService.saveNotification(formData, editingId ?? undefined);
      setIsModalOpen(false);
      fetchNotifications();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchText.toLowerCase());
    const matchesType = typeFilter === 'all' || n.type === typeFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && n.active) ||
      (statusFilter === 'inactive' && !n.active);
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <NotificationHeader
        onRefresh={fetchNotifications}
        onCreate={handleCreate}
        loading={loading}
      />

      <NotificationFilters
        searchText={searchText}
        setSearchText={setSearchText}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
          No hay notificaciones
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredNotifications.map(notification => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onToggleActive={handleToggleActive}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <NotificationFormModal
          isEditing={!!editingId}
          formData={formData}
          setFormData={setFormData}
          saving={saving}
          nativeDateLocale={nativeDateLocale}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
