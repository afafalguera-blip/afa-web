import { Search } from 'lucide-react';

export function Filters({ course, setCourse, activity, setActivity, status, setStatus, search, setSearch }: any) {
  return (
    <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center">
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar alumne..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <select 
        value={activity}
        onChange={(e) => setActivity(e.target.value)}
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Totes les activitats</option>
        {/* Placeholder for activities, should be populated dynamically */}
      </select>
      
      <select 
        value={course}
        onChange={(e) => setCourse(e.target.value)}
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Tots els cursos</option>
        <option value="I3">I3</option>
        <option value="I4">I4</option>
        <option value="I5">I5</option>
        <option value="1PRI">1r Primària</option>
        <option value="2PRI">2n Primària</option>
        <option value="3PRI">3r Primària</option>
        <option value="4PRI">4t Primària</option>
        <option value="5PRI">5è Primària</option>
        <option value="6PRI">6è Primària</option>
      </select>

      <select 
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">Tots els estats</option>
        <option value="alta">Actius</option>
        <option value="suspended">Suspesos</option>
        <option value="baja">Baixes</option>
      </select>
    </div>
  );
}
