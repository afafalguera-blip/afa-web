import { useEffect, useState, useCallback } from 'react';
import { AdminObservabilityService } from '../../services/admin/AdminObservabilityService';
import type { AuditLog } from '../../services/admin/AdminObservabilityService';
import { ObservabilityHeader } from '../../components/admin/observability/ObservabilityHeader';
import { ObservabilityLogTable } from '../../components/admin/observability/ObservabilityLogTable';

export default function AdminObservability() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AdminObservabilityService.getLogs(50);
      setLogs(data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <ObservabilityHeader />

      <ObservabilityLogTable
        logs={logs}
        loading={loading}
      />
    </div>
  );
}
