import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderHeart } from 'lucide-react';
import { AdminProjectsService } from '../../services/admin/AdminProjectsService';
import type { Project, ProjectFormData } from '../../services/admin/AdminProjectsService';
import { TranslationService } from '../../services/TranslationService';
import { ProjectsHeader } from '../../components/admin/projects/ProjectsHeader';
import { ProjectsFilterBar } from '../../components/admin/projects/ProjectsFilterBar';
import { ProjectCard } from '../../components/admin/projects/ProjectCard';
import { ProjectFormModal } from '../../components/admin/projects/ProjectFormModal';

const EMPTY_TRANSLATIONS = {
  ca: { title: '', description: '', details: '', impact: '', participants: '' },
  es: { title: '', description: '', details: '', impact: '', participants: '' },
  en: { title: '', description: '', details: '', impact: '', participants: '' }
};

const EMPTY_FORM: ProjectFormData = {
  title: '',
  description: '',
  image_url: '',
  translations: { ...EMPTY_TRANSLATIONS }
};

export default function ProjectsManager() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(EMPTY_FORM);
  const [activeLang, setActiveLang] = useState<'ca' | 'es' | 'en'>('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await AdminProjectsService.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProject(null);
    setFormData({
      title: '',
      description: '',
      image_url: '',
      translations: {
        ca: { title: '', description: '', details: '', impact: '', participants: '' },
        es: { title: '', description: '', details: '', impact: '', participants: '' },
        en: { title: '', description: '', details: '', impact: '', participants: '' }
      }
    });
    setActiveLang('es');
    setIsModalOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description || '',
      image_url: project.image_url || '',
      translations: {
        ca: { title: '', description: '', details: '', impact: '', participants: '' },
        es: { title: project.title, description: project.description || '', details: '', impact: '', participants: '' },
        en: { title: '', description: '', details: '', impact: '', participants: '' },
        ...(project.translations || {})
      }
    });
    setActiveLang('es');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.projects.delete_confirm'))) return;

    try {
      await AdminProjectsService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting project:', error);
      alert(t('common.error_delete'));
    }
  };

  const handleToggleArchive = async (project: Project) => {
    const newStatus = project.status === 'active' ? 'archived' : 'active';

    try {
      await AdminProjectsService.toggleArchive(project.id, newStatus);
      setProjects(prev => prev.map(p =>
        p.id === project.id ? { ...p, status: newStatus } : p
      ));
    } catch (error) {
      console.error('Error updating project:', error);
      alert(t('common.error_save'));
    }
  };

  const handleAutoTranslate = async () => {
    const sourceContent = formData.translations[activeLang];

    if (!sourceContent.title) {
      alert(t('admin.news.fill_source_first'));
      return;
    }

    setIsTranslating(true);
    try {
      const targetLangs = (['ca', 'es', 'en'] as const).filter(l => l !== activeLang);
      const updatedTranslations = { ...formData.translations };

      for (const lang of targetLangs) {
        const translated = await TranslationService.translateContent(
          sourceContent,
          lang,
          activeLang
        );
        if (translated) {
          updatedTranslations[lang] = {
            title: translated.title || '',
            description: translated.description || '',
            details: translated.details || '',
            impact: translated.impact || '',
            participants: translated.participants || ''
          };
        }
      }

      setFormData(prev => ({
        ...prev,
        translations: updatedTranslations
      }));
    } catch (error) {
      console.error('Translation error:', error);
      alert(t('common.error_translation'));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    if (!formData.translations.es.title.trim() && !formData.title.trim()) {
      alert(t('admin.projects.title_required'));
      return;
    }

    setSaving(true);
    try {
      const maxOrder = projects.reduce((max, p) => Math.max(max, p.display_order), 0);
      await AdminProjectsService.saveProject(formData, maxOrder, editingProject?.id);
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
      <ProjectsHeader
        loading={loading}
        onRefresh={fetchProjects}
        onCreate={handleCreate}
      />

      <ProjectsFilterBar
        searchText={searchText}
        setSearchText={setSearchText}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

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
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleArchive={handleToggleArchive}
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <ProjectFormModal
          isEditing={!!editingProject}
          formData={formData}
          setFormData={setFormData}
          activeLang={activeLang}
          setActiveLang={setActiveLang}
          isTranslating={isTranslating}
          saving={saving}
          onAutoTranslate={handleAutoTranslate}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
