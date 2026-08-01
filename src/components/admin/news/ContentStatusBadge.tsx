/**
 * Shared visibility UI for the whole content zone (news, projects, notifications,
 * announcement banner).
 *
 * Each entity persists visibility in a different column — news.published +
 * published_at, projects.status ('active' | 'archived'), notifications.active,
 * site_announcements.is_active — and the DB schema is intentionally left alone.
 * This component unifies only the UI layer: one pill, one set of labels, one
 * toggle affordance and one placement rule (badge next to the title, toggle as
 * the first action of the card footer / page header).
 *
 * It lives inside news/ because the CMS refactor whitelist only allows new files
 * inside the entity folders of this zone.
 */
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';

/** How the "not visible" state is named for each entity. */
export type HiddenKind = 'draft' | 'archived' | 'inactive';

/** Shape shared by every status pill of the zone (also reused by task statuses). */
export const STATUS_PILL_CLASS =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap';

export function useContentStatusLabels() {
  const { t } = useTranslation();

  return {
    visible: t('admin.status.visible', 'Publicat'),
    hidden: {
      draft: t('admin.status.draft', 'Esborrany'),
      archived: t('admin.status.archived', 'Arxivat'),
      inactive: t('admin.status.inactive', 'Inactiu')
    } as Record<HiddenKind, string>,
    show: {
      draft: t('admin.status.action_publish', 'Publicar'),
      archived: t('admin.status.action_unarchive', 'Restaurar'),
      inactive: t('admin.status.action_activate', 'Activar')
    } as Record<HiddenKind, string>,
    hide: {
      draft: t('admin.status.action_unpublish', 'Despublicar'),
      archived: t('admin.status.action_archive', 'Arxivar'),
      inactive: t('admin.status.action_deactivate', 'Desactivar')
    } as Record<HiddenKind, string>
  };
}

export interface ContentStatusBadgeProps {
  visible: boolean;
  hiddenKind?: HiddenKind;
}

export function ContentStatusBadge({ visible, hiddenKind = 'draft' }: ContentStatusBadgeProps) {
  const labels = useContentStatusLabels();

  return (
    <span
      className={`${STATUS_PILL_CLASS} ${
        visible ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'
      }`}
    >
      {visible ? <Eye className="w-3 h-3" aria-hidden="true" /> : <EyeOff className="w-3 h-3" aria-hidden="true" />}
      {visible ? labels.visible : labels.hidden[hiddenKind]}
    </span>
  );
}

export interface VisibilityToggleButtonProps {
  visible: boolean;
  hiddenKind?: HiddenKind;
  onToggle: () => void;
  disabled?: boolean;
}

export function VisibilityToggleButton({
  visible,
  hiddenKind = 'draft',
  onToggle,
  disabled = false
}: VisibilityToggleButtonProps) {
  const labels = useContentStatusLabels();
  const label = visible ? labels.hide[hiddenKind] : labels.show[hiddenKind];

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-neutral-200 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 transition-colors"
    >
      {visible ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
      {label}
    </button>
  );
}
