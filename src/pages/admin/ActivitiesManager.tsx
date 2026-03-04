import { useEffect, useState, useCallback } from "react";
import { ActivityService } from "../../services/ActivityService";
import { useTranslation } from "react-i18next";
import type { Activity } from "../../services/ActivityService";
import { ActivityEditorModal } from "../../components/admin/ActivityEditorModal";
import { AlertCircle } from "lucide-react";
import { ActivityAdminHeader } from "../../components/admin/activities/ActivityAdminHeader";
import { ActivityAdminCard } from "../../components/admin/activities/ActivityAdminCard";

export default function ActivitiesManager() {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleDelete = async (id: number) => {
    if (confirm(t('admin.activities.delete_confirm'))) {
      try {
        await ActivityService.delete(id);
        fetchActivities();
      } catch {
        alert(t('common.error_delete'));
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <ActivityAdminHeader onCreate={handleCreate} />

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl mb-6 flex items-center gap-3 border border-red-200">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map(activity => (
            <ActivityAdminCard
              key={activity.id}
              activity={activity}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ActivityEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        activity={editingActivity}
        onSaved={fetchActivities}
      />
    </div>
  );
}
