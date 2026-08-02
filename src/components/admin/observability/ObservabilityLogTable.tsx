import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es, ca } from 'date-fns/locale';
import type { AuditLog } from '../../../services/admin/AdminObservabilityService';
import { AdminTable, AdminPagination } from '../common/AdminTable';
import type { AdminTableColumn } from '../common/AdminTable';
import { ObservabilityActionBadge } from './ObservabilityActionBadge';

interface ObservabilityLogTableProps {
    logs: AuditLog[];
    loading: boolean;
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    onSelect: (log: AuditLog) => void;
}

export function ObservabilityLogTable({
    logs,
    loading,
    page,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
    onSelect
}: ObservabilityLogTableProps) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language === 'ca' ? ca : es;

    const columns: AdminTableColumn<AuditLog>[] = [
        {
            key: 'date',
            header: t('admin.observability.table.date', 'Data'),
            className: 'whitespace-nowrap',
            render: (log) => format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale })
        },
        {
            key: 'user',
            header: t('admin.observability.table.user', 'Usuari'),
            render: (log) => (
                <span className={log.profiles?.full_name ? 'text-neutral-800' : 'text-neutral-400 italic'}>
                    {log.profiles?.full_name || t('admin.observability.system_user', 'Sistema')}
                </span>
            )
        },
        {
            key: 'action',
            header: t('admin.observability.table.action', 'Acció'),
            render: (log) => <ObservabilityActionBadge action={log.action} />
        },
        {
            key: 'table_name',
            header: t('admin.observability.table.table_name', 'Taula'),
            render: (log) => (
                <code className="px-1.5 py-0.5 rounded bg-neutral-100 text-[12px] text-neutral-700">
                    {log.table_name}
                </code>
            )
        },
        {
            key: 'record_id',
            header: t('admin.observability.table.id', 'ID Registre'),
            className: 'font-mono text-neutral-500',
            render: (log) => (
                <span title={log.record_id}>
                    {log.record_id ? `${log.record_id.substring(0, 8)}…` : '—'}
                </span>
            )
        },
        {
            key: 'detail',
            header: <span className="sr-only">{t('admin.observability.table.detail', 'Detall')}</span>,
            className: 'text-right whitespace-nowrap',
            render: (log) => (
                <button
                    type="button"
                    onClick={() => onSelect(log)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-neutral-200 bg-white text-[12px] text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                    {t('admin.observability.table.detail', 'Detall')}
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            )
        }
    ];

    return (
        <AdminTable<AuditLog>
            columns={columns}
            rows={logs}
            keyExtractor={(log) => log.id}
            loading={loading}
            emptyMessage={t('admin.observability.table.no_results', "No s'han trobat registres d'auditoria.")}
            footer={
                <AdminPagination
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                />
            }
        />
    );
}
