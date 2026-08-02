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
import { Eye, EyeOff } from 'lucide-react';
import { STATUS_PILL_CLASS, useContentStatusLabels, type HiddenKind } from './contentStatus';

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
