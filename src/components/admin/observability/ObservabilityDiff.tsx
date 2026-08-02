import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AuditLog } from '../../../services/admin/AdminObservabilityService';

/** Más allá de esto el valor se corta: la celda es para leer, no para volcar JSON. */
const MAX_VALUE_CHARS = 300;

type ChangeKind = 'added' | 'removed' | 'changed';

interface FieldChange {
  key: string;
  kind: ChangeKind;
  before: string | null;
  after: string | null;
}

const stringify = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value === '' ? '""' : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value, null, 0);
};

const truncate = (value: string): string =>
  value.length > MAX_VALUE_CHARS ? `${value.slice(0, MAX_VALUE_CHARS)}…` : value;

const isEmpty = (value: unknown): boolean => value === null || value === undefined;

function computeChanges(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
): FieldChange[] {
  const keys = [...new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})])].sort();

  return keys.reduce<FieldChange[]>((acc, key) => {
    const before = oldData?.[key];
    const after = newData?.[key];

    // Comparación estructural: evita marcar como cambio un objeto reordenado.
    if (JSON.stringify(before ?? null) === JSON.stringify(after ?? null)) return acc;

    let kind: ChangeKind = 'changed';
    if (!oldData || isEmpty(before)) kind = 'added';
    else if (!newData || isEmpty(after)) kind = 'removed';

    acc.push({
      key,
      kind,
      before: oldData ? truncate(stringify(before)) : null,
      after: newData ? truncate(stringify(after)) : null
    });
    return acc;
  }, []);
}

const KIND_DOT: Record<ChangeKind, string> = {
  added: 'bg-green-500',
  removed: 'bg-red-500',
  changed: 'bg-amber-500'
};

export function ObservabilityDiff({ log }: { log: AuditLog }) {
  const { t } = useTranslation();
  const changes = useMemo(() => computeChanges(log.old_data, log.new_data), [log]);

  if (changes.length === 0) {
    return (
      <p className="text-[13px] text-neutral-500">
        {t('admin.observability.diff.no_changes', 'Aquest registre no conté cap canvi de dades.')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-neutral-500">
        {t('admin.observability.diff.summary', '{{count}} camps modificats', { count: changes.length })}
      </p>

      <ul className="divide-y divide-neutral-100 border border-neutral-200 rounded-md">
        {changes.map((change) => (
          <li key={change.key} className="px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${KIND_DOT[change.kind]}`} aria-hidden="true" />
              <code className="text-[12px] font-medium text-neutral-900 break-all">{change.key}</code>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-3.5">
              {change.before !== null && (
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-400 mb-0.5">
                    {t('admin.observability.diff.before', 'Abans')}
                  </p>
                  <p className="text-[12px] text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1 break-words whitespace-pre-wrap">
                    {change.before}
                  </p>
                </div>
              )}
              {change.after !== null && (
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-400 mb-0.5">
                    {t('admin.observability.diff.after', 'Després')}
                  </p>
                  <p className="text-[12px] text-green-700 bg-green-50 border border-green-100 rounded px-2 py-1 break-words whitespace-pre-wrap">
                    {change.after}
                  </p>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ObservabilityDiff;
