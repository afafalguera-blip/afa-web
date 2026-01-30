import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Archive,
  RefreshCw,
  FolderHeart
} from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  status: 'active' | 'archived';
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface ProjectFormData {
  title: string;
  description: string;
  image_url: string;
}

export default function ProjectsManager() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    image_url: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProject(null);
    setFormData({ title: '', description: '', image_url: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description || '',
      image_url: project.image_url || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.projects.delete_confirm'))) return;
    
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting project:', error);
      alert(t('common.error_delete'));
    }
  };

  const handleToggleArchive = async (project: Project) => {
    const newStatus = project.status === 'active' ? 'archived' : 'active';

    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', project.id);

      if (error) throw error;
      
      setProjects(prev => prev.map(p => 
        p.id === project.id ? { ...p, status: newStatus } : p
      ));
    } catch (error) {
      console.error('Error updating project:', error);
      alert(t('common.error_save'));
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert(t('admin.projects.title_required'));
      return;
    }

    setSaving(true);
    try {
      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update({
            title: formData.title,
            description: formData.description,
            image_url: formData.image_url || null
          })
          .eq('id', editingProject.id);

        if (error) throw error;
      } else {
        const maxOrder = projects.reduce((max, p) => Math.max(max, p.display_order), 0);
        const { error } = await supabase
          .from('projects')
          .insert([{
            title: formData.title,
            description: formData.description,
            image_url: formData.image_url || null,
            status: 'active',
            display_order: maxOrder + 1
          }]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchProjects();
    } catch (error) {
      console.error('Error saving project:', error);
      alert(t('common.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    if (statusFilter !== 'all' && project.status !== statusFilter) return false;
    if (searchText && !project.title.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('admin.projects.title')}</h1>
          <p className="text-slate-500">{t('admin.projects.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchProjects}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('admin.projects.new_project')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder={t('admin.projects.search_placeholder')}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'archived')}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          <option value="all">{t('admin.projects.status_all')}</option>
          <option value="active">{t('admin.projects.status_active')}</option>
          <option value="archived">{t('admin.projects.status_archived')}</option>
        </select>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          <FolderHeart className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          {searchText || statusFilter !== 'all' ? t('admin.projects.no_results') : t('admin.projects.no_projects')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <div 
              key={project.id}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                project.status === 'archived' ? 'border-slate-300 opacity-70' : 'border-slate-200'
              }`}
            >
              {project.image_url && (
                <div className="aspect-video bg-slate-100">
                  <img 
                    src={project.image_url} 
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900">{project.title}</h3>
                  {project.status === 'archived' && (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                      {t('admin.projects.status_archived')}
                    </span>
                  )}
                </div>
                {project.description && (
                  <p className="text-sm text-slate-500 line-clamp-3 mb-4">{project.description}</p>
                )}
                <div className="flex items-center gap-1 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleToggleArchive(project)}
                    className={`p-2 rounded-lg transition-colors ${
                      project.status === 'active' 
                        ? 'text-amber-600 hover:bg-amber-50' 
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={project.status === 'active' ? t('admin.projects.archive') : t('admin.projects.unarchive')}
                  >
                    <Archive className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleEdit(project)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title={t('common.edit')}
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingProject ? t('admin.projects.edit_project') : t('admin.projects.new_project')}
              </h2>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('admin.projects.field_title')} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={t('admin.projects.title_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('admin.projects.field_description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={5}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder={t('admin.projects.description_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('admin.projects.field_image_url')}
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={e => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
