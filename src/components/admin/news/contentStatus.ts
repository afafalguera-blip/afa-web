/**
 * Non-component half of the shared visibility UI (see ContentStatusBadge.tsx).
 *
 * Kept in its own module so the component file only exports components: mixing
 * both breaks React Fast Refresh (react-refresh/only-export-components).
 */
import { useTranslation } from 'react-i18next';

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
