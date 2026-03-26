import { Search } from 'lucide-react';
import type { Notification } from '../../../services/admin/AdminNotificationService';

interface NotificationFiltersProps {
  searchText: string;
  setSearchText: (value: string) => void;
  typeFilter: 'all' | Notification['type'];
  setTypeFilter: (value: 'all' | Notification['type']) => void;
  statusFilter: 'all' | 'active' | 'inactive';
  setStatusFilter: (value: 'all' | 'active' | 'inactive') => void;
}

export function NotificationFilters({
  searchText, setSearchText,
  typeFilter, setTypeFilter,
  statusFilter, setStatusFilter
}: NotificationFiltersProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-4">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Buscar notificaciones..."
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
      </div>

      <select
        value={typeFilter}
        onChange={e => setTypeFilter(e.target.value as 'all' | Notification['type'])}
        className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[180px]"
      >
        <option value="all">Todos los tipos</option>
        <option value="info">Información</option>
        <option value="alert">Alerta</option>
        <option value="news">Noticia</option>
      </select>

      <select
        value={statusFilter}
        onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
        className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[180px]"
      >
        <option value="all">Todos los estados</option>
        <option value="active">Activas</option>
        <option value="inactive">Inactivas</option>
      </select>
    </div>
  );
}
