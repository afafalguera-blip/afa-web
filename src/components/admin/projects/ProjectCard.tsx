import { useTranslation } from 'react-i18next';
import { Edit, Trash2 } from 'lucide-react';
import type { Project } from '../../../services/admin/AdminProjectsService';
import { proxyStorageUrl } from '../../../utils/storageUrl';
import { ContentStatusBadge, VisibilityToggleButton } from '../news/ContentStatusBadge';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onToggleArchive: (project: Project) => void;
}

export function ProjectCard({ project, onEdit, onDelete, onToggleArchive }: ProjectCardProps) {
  const { t } = useTranslation();
  const visible = project.status === 'active';

  return (
    <div
      className={`bg-white rounded-lg border overflow-hidden transition-shadow hover:shadow-sm ${
        visible ? 'border-neutral-200' : 'border-neutral-300 opacity-75'
      }`}
    >
      <div className="aspect-video bg-neutral-100">
        <img
          src={proxyStorageUrl(project.image_url) || 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2069&auto=format&fit=crop'}
          alt={project.title}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-5">
        <div className="mb-3">
          <ContentStatusBadge visible={visible} hiddenKind="archived" />
        </div>

        <h3 className="font-semibold text-[15px] text-neutral-900 line-clamp-2 mb-2">{project.title}</h3>

        {project.description && (
          <p className="text-[13px] text-neutral-500 line-clamp-3 mb-5">{project.description}</p>
        )}

        <div className="flex items-center justify-between gap-2 pt-4 border-t border-neutral-100">
          <VisibilityToggleButton
            visible={visible}
            hiddenKind="archived"
            onToggle={() => onToggleArchive(project)}
          />

          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onEdit(project)}
              className="p-2 rounded-md text-neutral-600 hover:bg-neutral-100 transition-colors"
              title={t('common.edit')}
              aria-label={t('common.edit')}
            >
              <Edit className="w-[18px] h-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(project.id)}
              className="p-2 rounded-md text-red-600 hover:bg-red-50 transition-colors"
              title={t('common.delete')}
              aria-label={t('common.delete')}
            >
              <Trash2 className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
