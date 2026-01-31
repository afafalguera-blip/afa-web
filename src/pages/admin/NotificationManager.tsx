import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Bell,
  AlertCircle,
  Info,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: 'news' | 'alert' | 'info';
  link: string | null;
  start_at: string;
  end_at: string | null;
  active: boolean;
  created_at: string;
}

export default function NotificationManager() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<{
    title: string;
    message: string;
    type: 'news' | 'alert' | 'info';
    link: string;
    start_at: string;
    end_at: string;
    active: boolean;
  }>({
    title: '',
    message: '',
    type: 'info',
    link: '',
    start_at: '',
    end_at: '',
    active: true
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
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
      title: '',
      message: '',
      type: 'info',
      link: '',
      start_at: new Date().toISOString().slice(0, 16),
      end_at: '',
      active: true
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
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error al eliminar');
    }
  };

  const handleToggleActive = async (notification: Notification) => {
    const newActive = !notification.active;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ active: newActive })
        .eq('id', notification.id);

      if (error) throw error;
      
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
      const payload = {
        title: formData.title,
        message: formData.message || null,
        type: formData.type,
        link: formData.link || null,
        start_at: new Date(formData.start_at).toISOString(),
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
        active: formData.active
      };

      if (editingId) {
        const { error } = await supabase
          .from('notifications')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notifications')
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchNotifications();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const filteredNotifications = notifications.filter(n =>
    n.title.toLowerCase().includes(searchText.toLowerCase())
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'news': return <Calendar className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestor de Notificaciones</h1>
          <p className="text-slate-500">Administra los avisos y alertas de la campanita</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchNotifications}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Notificación
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar notificaciones..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>
      </div>

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
            <div 
              key={notification.id}
              className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow ${
                notification.active ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-75'
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
                      <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded-full ${
                        notification.type === 'alert' ? 'bg-red-100 text-red-700' :
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
                    onClick={() => handleToggleActive(notification)}
                    className={`p-2 rounded-lg transition-colors ${
                      notification.active
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-slate-400 hover:bg-slate-100'
                    }`}
                    title={notification.active ? 'Desactivar' : 'Activar'}
                  >
                    {notification.active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleEdit(notification)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? 'Editar Notificación' : 'Nueva Notificación'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej: Fiesta del Chocolate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mensaje (Opcional)</label>
                <textarea
                  value={formData.message}
                  onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={3}
                  placeholder="Detalles breves..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                   <select
                     value={formData.type}
                     onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                   >
                     <option value="info">Información</option>
                     <option value="alert">Alerta</option>
                     <option value="news">Noticia</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Enlace (Opcional)</label>
                   <input
                     type="text"
                     value={formData.link}
                     onChange={e => setFormData(prev => ({ ...prev, link: e.target.value }))}
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                     placeholder="https://..."
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Mostrar desde *</label>
                   <input
                     type="datetime-local"
                     value={formData.start_at}
                     onChange={e => setFormData(prev => ({ ...prev, start_at: e.target.value }))}
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Mostrar hasta</label>
                   <input
                     type="datetime-local"
                     value={formData.end_at}
                     onChange={e => setFormData(prev => ({ ...prev, end_at: e.target.value }))}
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                   />
                   <p className="text-xs text-slate-400 mt-1">Dejar vacío para indefinido</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                 <input
                   type="checkbox"
                   id="active"
                   checked={formData.active}
                   onChange={e => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                   className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                 />
                 <label htmlFor="active" className="text-sm font-medium text-slate-700">Activo visible</label>
              </div>

            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
