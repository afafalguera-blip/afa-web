import { useEffect, useState } from "react";
import { ActivityService } from "../../services/ActivityService";
import type { Activity } from "../../services/ActivityService";
import { ActivityEditorModal } from "../../components/admin/ActivityEditorModal";
import { Plus, Pencil, Trash2, AlertCircle } from "lucide-react";

export default function ActivitiesManager() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const data = await ActivityService.getAll();
      setActivities(data);
    } catch (err: any) {
      console.error(err);
      setError("No s'han pogut carregar les activitats. Assegura't que la base de dades està configurada.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setIsEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingActivity(null);
    setIsEditorOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Estàs segur que vols eliminar aquesta activitat?")) {
        try {
            await ActivityService.delete(id);
            fetchActivities();
        } catch (err) {
            alert("Error al eliminar");
        }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Gestió d'Activitats</h1>
           <p className="text-slate-500">Administra totes les extraescolars, preus i places.</p>
        </div>
        <button 
            onClick={handleCreate}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/30 flex items-center gap-2 transition-all"
        >
            <Plus className="w-5 h-5" /> Nova Activitat
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl mb-6 flex items-center gap-3 border border-red-200">
            <AlertCircle className="w-5 h-5" />
            {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map(activity => (
                <div key={activity.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <div className="h-40 relative">
                        <img src={activity.image_url} alt={activity.title} className="w-full h-full object-cover" />
                        <div className={`absolute top-4 right-4 ${activity.color} text-white text-xs font-bold px-3 py-1 rounded-full uppercase`}>
                            {activity.category}
                        </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                             <h3 className="font-bold text-lg dark:text-white line-clamp-1">{activity.title}</h3>
                             <span className="font-bold text-slate-900 dark:text-slate-200">{activity.price}€</span>
                        </div>
                        <p className="text-slate-500 text-sm line-clamp-2 mb-4 flex-1">{activity.description}</p>
                        
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-400 mb-4 border-t pt-3">
                            <span>{activity.spots} Places</span>
                            <span>•</span>
                            <span>{activity.grades}</span>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleEdit(activity)}
                                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold flex justify-center items-center gap-2 transition-colors"
                            >
                                <Pencil className="w-4 h-4" /> Editar
                            </button>
                             <button 
                                onClick={() => handleDelete(activity.id)}
                                className="w-10 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}

      <ActivityEditorModal 
         isOpen={isEditorOpen} 
         onClose={() => setIsEditorOpen(false)} 
         activity={editingActivity}
         onSaved={() => {
             fetchActivities();
         }}
      />
    </div>
  );
}
