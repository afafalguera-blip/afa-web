import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  loading?: boolean;
  onRefresh?: () => void;
  /** Extra controls rendered before the refresh/create buttons. */
  actions?: React.ReactNode;
  onCreate?: () => void;
  createLabel?: string;
  /** Defaults to Plus; the documents manager uses Upload. */
  createIcon?: LucideIcon;
}

export function AdminPageHeader({
  title,
  subtitle,
  icon: Icon,
  loading = false,
  onRefresh,
  actions,
  onCreate,
  createLabel,
  createIcon: CreateIcon = Plus
}: AdminPageHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="p-2 rounded-lg bg-neutral-100 border border-neutral-200 flex-shrink-0">
            <Icon className="w-5 h-5 text-neutral-700" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {actions}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title={t('common.refresh')}
            aria-label={t('common.refresh')}
            className="p-2 rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-[18px] h-[18px] ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}

        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-admin-accent hover:bg-admin-accent-hover text-white text-[13px] font-medium transition-colors"
          >
            <CreateIcon className="w-4 h-4" />
            {createLabel ?? t('common.create', 'Crear')}
          </button>
        )}
      </div>
    </div>
  );
}

export default AdminPageHeader;
