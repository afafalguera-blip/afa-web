import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderHeart } from 'lucide-react';
import { AdminProjectsService } from '../../services/admin/AdminProjectsService';
import type { Project, ProjectFormData } from '../../services/admin/AdminProjectsService';
import { TranslationService } from '../../services/TranslationService';
import { AdminPageHeader } from '../../components/admin/common/AdminPageHeader';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { useDirtyGuard } from '../../hooks/useDirtyGuard';
import { ProjectsFilterBar } from '../../components/admin/projects/ProjectsFilterBar';
import { ProjectCard } from '../../components/admin/projects/ProjectCard';
import { ProjectFormModal } from '../../components/admin/projects/ProjectFormModal';

const createEmptyForm = (): ProjectFormData => ({
  title: '',
  description: '',
  image_url: '',
  translations: {
    ca: { title: '', description: '', details: '', impact: '', participants: '' },
    es: { title: '', description: '', details: '', impact: '', participants: '' },
    en: { title: '', description: '', details: '', impact: '', participants: '' }
  }
});

export default function ProjectsManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(createEmptyForm);
  const [formSnapshot, setFormSnapshot] = useState('');
  const [activeLang, setActiveLang] = useState<'ca' | 'es' | 'en'>('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [saving, setSaving] = useState(false);

  const isDirty = isModalOpen && JSON.stringify(formData) !== formSnapshot;
  const { confirmDiscard } = useDirtyGuard(isDirty);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminProjectsService.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error(t('common.error_generic'));
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const openModal = (project: Project | null, data: ProjectFormData) => {
    setEditingProject(project);
    setFormData(data);
    setFormSnapshot(JSON.stringify(data));
    setActiveLang('es');
    setIsModalOpen(true);
  };

  const handleCreate = () => openModal(null, createEmptyForm());

  const handleEdit = (project: Project) => {
    openModal(project, {
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
  };

  const handleCloseModal = async () => {
    if (!(await confirmDiscard())) return;
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    const project = projects.find((item) => item.id === id);
    const accepted = await confirm({
      title: t('admin.projects.delete_confirm'),
      itemName: project?.title,
      confirmLabel: t('common.delete'),
      destructive: true
    });
    if (!accepted) return;

    try {
      await AdminProjectsService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success(t('admin.projects.deleted', 'Projecte eliminat'));
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error(t('common.error_delete'));
    }
  };

  const handleToggleArchive = async (project: Project) => {
    const newStatus = project.status === 'active' ? 'archived' : 'active';

    try {
      await AdminProjectsService.toggleArchive(project.id, newStatus);
      setProjects(prev => prev.map(p =>
        p.id === project.id ? { ...p, status: newStatus } : p
      ));
      toast.success(
        newStatus === 'active'
          ? t('admin.status.published_toast', 'Contingut publicat')
          : t('admin.status.unpublished_toast', 'Contingut despublicat')
      );
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error(t('common.error_save'));
    }
  };

  const handleAutoTranslate = async () => {
    const sourceContent = formData.translations[activeLang];

    if (!sourceContent.title) {
      toast.error(t('admin.news.fill_source_first'));
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
      toast.success(t('admin.news.translated', 'Traduccions generades'));
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(t('common.error_translation'));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    if (!formData.translations.es.title.trim() && !formData.title.trim()) {
      toast.error(t('admin.projects.title_required'));
      return;
    }

    setSaving(true);
    try {
      const maxOrder = projects.reduce((max, p) => Math.max(max, p.display_order), 0);
      await AdminProjectsService.saveProject(formData, maxOrder, editingProject?.id);
      setFormSnapshot(JSON.stringify(formData));
      setIsModalOpen(false);
      toast.success(t('admin.projects.saved', 'Projecte desat'));
      await fetchProjects();
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error(t('common.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const filteredProjects = useMemo(() => projects.filter(project => {
    if (statusFilter !== 'all' && project.status !== statusFilter) return false;
    if (searchText && !project.title.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  }), [projects, statusFilter, searchText]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AdminPageHeader
        title={t('admin.projects.title')}
        subtitle={t('admin.projects.subtitle')}
        icon={FolderHeart}
        loading={loading}
        onRefresh={fetchProjects}
        onCreate={handleCreate}
        createLabel={t('admin.projects.new_project')}
      />

      <ProjectsFilterBar
        searchText={searchText}
        setSearchText={setSearchText}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center text-neutral-500">
          <FolderHeart className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
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

      <ProjectFormModal
        open={isModalOpen}
        isEditing={!!editingProject}
        formData={formData}
        setFormData={setFormData}
        activeLang={activeLang}
        setActiveLang={setActiveLang}
        isTranslating={isTranslating}
        saving={saving}
        onAutoTranslate={handleAutoTranslate}
        onSave={handleSave}
        onClose={handleCloseModal}
      />
    </div>
  );
}
