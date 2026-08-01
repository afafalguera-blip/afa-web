import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Search, Sparkles } from "lucide-react";
import { ActivityService } from "../../services/ActivityService";
import type { Activity } from "../../services/ActivityService";
import { ActivityEditorModal } from "../../components/admin/ActivityEditorModal";
import { ActivityAdminCard } from "../../components/admin/activities/ActivityAdminCard";
import { AdminPageHeader } from "../../components/admin/common/AdminPageHeader";
import { useToast } from "../../components/common/Toast";
import { useConfirm } from "../../components/common/ConfirmDialog";

export default function ActivitiesManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ActivityService.getAll();
      setActivities(data);
    } catch (err) {
      console.error(err);
      setError(t('admin.activities.error_load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setIsEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingActivity(null);
    setIsEditorOpen(true);
  };

  const handleDelete = async (activity: Activity) => {
    const ok = await confirm({
      title: t('admin.activities.delete_title', 'Eliminar activitat'),
      message: t('admin.activities.delete_confirm'),
      itemName: activity.title,
      destructive: true
    });
    if (!ok) return;
    try {
      await ActivityService.delete(activity.id);
      toast.success(t('admin.activities.deleted', 'Activitat eliminada'));
      fetchActivities();
    } catch (err) {
      console.error(err);
      toast.error(t('common.error_delete'));
    }
  };

  const visibleActivities = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activities;
    return activities.filter(a =>
      [a.title, a.title_ca, a.title_en, a.category, a.grades, a.place, a.description]
        .some(v => (v ?? '').toLowerCase().includes(term))
    );
  }, [activities, search]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AdminPageHeader
        title={t('admin.activities.title')}
        subtitle={t('admin.activities.subtitle')}
        icon={Sparkles}
        loading={loading}
        onRefresh={fetchActivities}
        onCreate={handleCreate}
        createLabel={t('admin.activities.new_activity')}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('admin.activities.search_placeholder', 'Cerca per títol, categoria o lloc...')}
          aria-label={t('admin.activities.search_placeholder', 'Cerca per títol, categoria o lloc...')}
          className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg bg-white text-[13px] outline-none focus:ring-2 focus:ring-neutral-900/10"
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-center gap-3 border border-red-200">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-neutral-100 rounded-lg animate-pulse"></div>)}
        </div>
      ) : visibleActivities.length === 0 ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center text-neutral-500">
          {search ? t('common.no_results', 'Sense resultats') : t('admin.activities.empty', 'No hi ha activitats.')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleActivities.map(activity => (
            <ActivityAdminCard
              key={activity.id}
              activity={activity}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {isEditorOpen && (
        <ActivityEditorModal
          isOpen
          onClose={() => setIsEditorOpen(false)}
          activity={editingActivity}
          onSaved={fetchActivities}
        />
      )}
    </div>
  );
}
