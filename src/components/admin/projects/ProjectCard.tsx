import { useTranslation } from 'react-i18next';
import { Edit, Trash2, Archive } from 'lucide-react';
import type { Project } from '../../../services/admin/AdminProjectsService';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onToggleArchive: (project: Project) => void;
}

export function ProjectCard({ project, onEdit, onDelete, onToggleArchive }: ProjectCardProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
        project.status === 'archived' ? 'border-slate-300 opacity-70' : 'border-slate-200'
      }`}
    >
      <div className="aspect-video bg-slate-100 relative">
        <img
          src={project.image_url || 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2069&auto=format&fit=crop'}
          alt={project.title}
          className="w-full h-full object-cover"
        />
      </div>
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
            onClick={() => onToggleArchive(project)}
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
            onClick={() => onEdit(project)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title={t('common.edit')}
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(project.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={t('common.delete')}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
