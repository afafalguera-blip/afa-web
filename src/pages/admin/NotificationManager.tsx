import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { TranslationService } from '../../services/TranslationService';
import { getRegionalLanguageTag } from '../../utils/locale';
import { AdminNotificationService } from '../../services/admin/AdminNotificationService';
import type { Notification, NotificationFormData } from '../../services/admin/AdminNotificationService';
import { AdminPageHeader } from '../../components/admin/common/AdminPageHeader';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { useDirtyGuard } from '../../hooks/useDirtyGuard';
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirm = useConfirm();
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
  const [formSnapshot, setFormSnapshot] = useState('');
  const [saving, setSaving] = useState(false);

  const isDirty = isModalOpen && JSON.stringify(formData) !== formSnapshot;
  const { confirmDiscard } = useDirtyGuard(isDirty);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminNotificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error(t('common.error_generic'));
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const openModal = (id: string | null, data: NotificationFormData) => {
    setEditingId(id);
    setFormData(data);
    setFormSnapshot(JSON.stringify(data));
    setIsModalOpen(true);
  };

  const handleCreate = () => openModal(null, {
    ...EMPTY_FORM,
    start_at: new Date().toISOString().slice(0, 16)
  });

  const handleEdit = (notification: Notification) => openModal(notification.id, {
    title: notification.title,
    message: notification.message || '',
    type: notification.type,
    link: notification.link || '',
    start_at: new Date(notification.start_at).toISOString().slice(0, 16),
    end_at: notification.end_at ? new Date(notification.end_at).toISOString().slice(0, 16) : '',
    active: notification.active
  });

  const handleCloseModal = async () => {
    if (!(await confirmDiscard())) return;
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    const notification = notifications.find((item) => item.id === id);
    const accepted = await confirm({
      title: t('admin.notifications.delete_confirm', 'Segur que vols eliminar aquesta notificació?'),
      itemName: notification?.title,
      confirmLabel: t('common.delete'),
      destructive: true
    });
    if (!accepted) return;

    try {
      await AdminNotificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success(t('admin.notifications.deleted', 'Notificació eliminada'));
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error(t('common.error_delete'));
    }
  };

  const handleToggleActive = async (notification: Notification) => {
    const newActive = !notification.active;
    try {
      await AdminNotificationService.toggleActive(notification.id, newActive);
      setNotifications(prev => prev.map(n =>
        n.id === notification.id ? { ...n, active: newActive } : n
      ));
      toast.success(
        newActive
          ? t('admin.status.published_toast', 'Contingut publicat')
          : t('admin.status.unpublished_toast', 'Contingut despublicat')
      );
    } catch (error) {
      console.error('Error toggling active:', error);
      toast.error(t('common.error_save'));
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error(t('admin.notifications.title_required', 'El títol és obligatori'));
      return;
    }
    setSaving(true);
    try {
      const sourceLang = 'es';
      const targetLangs = ['ca', 'en'];
      const fields: Record<string, string> = { title: formData.title };
      if (formData.message?.trim()) fields.message = formData.message;

      let translations = formData.translations;
      try {
        const result = await TranslationService.translateBulk(fields, sourceLang, targetLangs);
        translations = {
          es: { title: formData.title, message: formData.message || undefined },
          ca: { title: result.ca?.title || formData.title, message: result.ca?.message || undefined },
          en: { title: result.en?.title || formData.title, message: result.en?.message || undefined },
        };
      } catch (translationErr) {
        console.error('Auto-translation failed, saving without translations:', translationErr);
      }

      await AdminNotificationService.saveNotification({ ...formData, translations }, editingId ?? undefined);
      setFormSnapshot(JSON.stringify(formData));
      setIsModalOpen(false);
      toast.success(t('admin.notifications.saved', 'Notificació desada'));
      await fetchNotifications();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error(t('common.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const filteredNotifications = useMemo(() => notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchText.toLowerCase());
    const matchesType = typeFilter === 'all' || n.type === typeFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && n.active) ||
      (statusFilter === 'inactive' && !n.active);
    return matchesSearch && matchesType && matchesStatus;
  }), [notifications, searchText, typeFilter, statusFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AdminPageHeader
        title={t('admin.notifications.title', 'Gestor de notificacions')}
        subtitle={t('admin.notifications.subtitle', 'Administra els avisos i alertes de la campaneta')}
        icon={Bell}
        loading={loading}
        onRefresh={fetchNotifications}
        onCreate={handleCreate}
        createLabel={t('admin.notifications.new', 'Nova notificació')}
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center text-neutral-500">
          <Bell className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
          {t('admin.notifications.empty', 'No hi ha notificacions')}
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

      <NotificationFormModal
        open={isModalOpen}
        isEditing={!!editingId}
        formData={formData}
        setFormData={setFormData}
        saving={saving}
        nativeDateLocale={nativeDateLocale}
        onSave={handleSave}
        onClose={handleCloseModal}
      />
    </div>
  );
}
