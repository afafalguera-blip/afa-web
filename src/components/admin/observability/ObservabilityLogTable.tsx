import { useTranslation } from 'react-i18next';
import { User, Table, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es, ca } from 'date-fns/locale';
import type { AuditLog } from '../../../services/admin/AdminObservabilityService';
import { ObservabilityActionBadge } from './ObservabilityActionBadge';

interface ObservabilityLogTableProps {
    logs: AuditLog[];
    loading: boolean;
}

export function ObservabilityLogTable({ logs, loading }: ObservabilityLogTableProps) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language === 'ca' ? ca : es;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="text-sm font-bold text-neutral-500 animate-pulse">{t('admin.observability.loading', 'Carregant historial...')}</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-neutral-50 dark:bg-neutral-950/50 border-b border-neutral-200 dark:border-neutral-800">
                            <th className="px-6 py-5 text-xs font-black text-neutral-400 uppercase tracking-widest">{t('admin.observability.table.date', 'Data')}</th>
                            <th className="px-6 py-5 text-xs font-black text-neutral-400 uppercase tracking-widest">{t('admin.observability.table.user', 'Usuari')}</th>
                            <th className="px-6 py-5 text-xs font-black text-neutral-400 uppercase tracking-widest">{t('admin.observability.table.action', 'Acció')}</th>
                            <th className="px-6 py-5 text-xs font-black text-neutral-400 uppercase tracking-widest">{t('admin.observability.table.table_name', 'Taula')}</th>
                            <th className="px-6 py-5 text-xs font-black text-neutral-400 uppercase tracking-widest">{t('admin.observability.table.id', 'ID Registre')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-16 text-center text-neutral-400 font-medium">
                                    {t('admin.observability.table.no_results', 'No s\'han trobat registres d\'auditoria.')}
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-all group">
                                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                                        <div className="flex items-center gap-2.5 font-medium">
                                            <Calendar className="w-4 h-4 text-neutral-400 group-hover:text-primary transition-colors" />
                                            {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm', { locale })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                <User className="w-4 h-4 text-neutral-500 dark:text-neutral-400 group-hover:text-primary" />
                                            </div>
                                            <span className="font-bold text-neutral-700 dark:text-neutral-200">
                                                {log.profiles?.full_name || t('admin.observability.system_user', 'Sistema')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <ObservabilityActionBadge action={log.action} />
                                    </td>
                                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                                        <div className="flex items-center gap-2.5 font-bold">
                                            <Table className="w-4 h-4 text-neutral-400" />
                                            <code className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-[11px] text-neutral-600 dark:text-neutral-300">
                                                {log.table_name}
                                            </code>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono text-neutral-400 dark:text-neutral-500">
                                        <span className="bg-neutral-50 dark:bg-neutral-900 px-2 py-1 rounded border border-neutral-100 dark:border-neutral-800">
                                            {log.record_id.substring(0, 8)}...
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
