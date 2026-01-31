import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { History, User, Table, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: any;
  new_data: any;
  changed_by: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export default function AdminObservability() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, profiles!changed_by(full_name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching logs:', error);
      } else {
        setLogs(data || []);
      }
      setLoading(false);
    }

    fetchLogs();
  }, []);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'UPDATE': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DELETE': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <History className="w-6 h-6 text-primary" />
          {t('admin.observability.title')}
        </h1>
        <p className="text-slate-500 mt-1">{t('admin.observability.subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-slate-500">{t('admin.observability.loading')}</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.observability.table.date')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.observability.table.user')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.observability.table.action')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.observability.table.table_name')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.observability.table.id')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">{t('admin.observability.table.no_results')}</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm', { locale: es })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <span className="font-medium text-slate-700">
                          {log.profiles?.full_name || t('admin.observability.system_user')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-full border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Table className="w-3.5 h-3.5 text-slate-400" />
                        {log.table_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {log.record_id.substring(0, 8)}...
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
