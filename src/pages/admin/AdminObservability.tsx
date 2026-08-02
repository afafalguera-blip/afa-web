import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { AdminObservabilityService } from '../../services/admin/AdminObservabilityService';
import type { AuditLog, AuditLogFacets } from '../../services/admin/AdminObservabilityService';
import { AdminPageHeader } from '../../components/admin/common/AdminPageHeader';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { ObservabilityLogTable } from '../../components/admin/observability/ObservabilityLogTable';
import { ObservabilityDiff } from '../../components/admin/observability/ObservabilityDiff';
import { ObservabilityActionBadge } from '../../components/admin/observability/ObservabilityActionBadge';
import { ObservabilityFilters } from '../../components/admin/observability/ObservabilityFilters';
import { EMPTY_FILTERS } from '../../components/admin/observability/observabilityFilterState';
import type { ObservabilityFilterState } from '../../components/admin/observability/observabilityFilterState';

const EMPTY_FACETS: AuditLogFacets = { tables: [], users: [] };
const SEARCH_DEBOUNCE_MS = 350;

export default function AdminObservability() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState<ObservabilityFilterState>(EMPTY_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [facets, setFacets] = useState<AuditLogFacets>(EMPTY_FACETS);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  // Cualquier cambio de filtro invalida la página actual.
  const filterKey = useMemo(
    () =>
      [
        debouncedSearch,
        filters.tableName,
        filters.action,
        filters.userId,
        filters.dateFrom,
        filters.dateTo
      ].join('|'),
    [
      debouncedSearch,
      filters.tableName,
      filters.action,
      filters.userId,
      filters.dateFrom,
      filters.dateTo
    ]
  );

  useEffect(() => {
    setPage(1);
  }, [filterKey, pageSize]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const { rows, total: count } = await AdminObservabilityService.getLogs({
        page,
        pageSize,
        search: debouncedSearch || undefined,
        tableName: filters.tableName || undefined,
        action: filters.action || undefined,
        userId: filters.userId || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined
      });
      setLogs(rows);
      setTotal(count);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error(t('admin.observability.load_error', "No s'ha pogut carregar l'historial d'auditoria."));
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    debouncedSearch,
    filters.tableName,
    filters.action,
    filters.userId,
    filters.dateFrom,
    filters.dateTo,
    toast,
    t
  ]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    AdminObservabilityService.getFacets()
      .then(setFacets)
      .catch((error) => console.error('Error fetching audit facets:', error));
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12">
      <AdminPageHeader
        title={t('admin.observability.title', 'Auditoria del Sistema')}
        subtitle={t(
          'admin.observability.subtitle',
          'Rastreig de canvis i accions realitzades a la plataforma.'
        )}
        icon={History}
        loading={loading}
        onRefresh={fetchLogs}
      />

      <ObservabilityFilters filters={filters} facets={facets} onChange={setFilters} />

      <ObservabilityLogTable
        logs={logs}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSelect={setSelected}
      />

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={t('admin.observability.detail.title', 'Detall del canvi')}
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-neutral-400">
                  {t('admin.observability.table.date', 'Data')}
                </dt>
                <dd className="text-neutral-800">
                  {format(new Date(selected.created_at), 'dd/MM/yyyy HH:mm:ss')}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-neutral-400">
                  {t('admin.observability.table.user', 'Usuari')}
                </dt>
                <dd className="text-neutral-800">
                  {selected.profiles?.full_name || t('admin.observability.system_user', 'Sistema')}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-neutral-400">
                  {t('admin.observability.table.action', 'Acció')}
                </dt>
                <dd>
                  <ObservabilityActionBadge action={selected.action} />
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[11px] uppercase tracking-wide text-neutral-400">
                  {t('admin.observability.table.table_name', 'Taula')}
                </dt>
                <dd className="text-neutral-800 break-all">
                  <code className="text-[12px]">{selected.table_name}</code>
                </dd>
              </div>
            </dl>

            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-neutral-400">
                {t('admin.observability.table.id', 'ID Registre')}
              </p>
              <code className="text-[12px] text-neutral-700 break-all">{selected.record_id || '—'}</code>
            </div>

            <ObservabilityDiff log={selected} />
          </div>
        )}
      </Modal>
    </div>
  );
}
