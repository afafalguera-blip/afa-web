import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Download, Loader2, Search, Wallet } from 'lucide-react';
import { AdminPageHeader } from '../../../components/admin/common/AdminPageHeader';
import { useToast } from '../../../components/common/Toast';
import { ConfigService } from '../../../services/ConfigService';
import { ExportService } from '../../../services/ExportService';
import {
  AdminAccountsService,
  type AccountsSnapshot,
  type ChildAccount,
  type ConceptKey,
  type ConceptStatus,
  type FamilyAccount,
} from '../../../services/admin/AdminAccountsService';
import { PAYMENT_CONCEPTS, PAYMENT_CONCEPT_LABELS } from '../../../types/payment';

// Same palette as the payments panel, plus the shop, so a concept keeps its
// colour wherever the admin sees it.
const CONCEPT_BADGE: Record<ConceptKey, string> = {
  extraescolar: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  acollida: 'bg-teal-50 text-teal-700 border-teal-100',
  soci: 'bg-purple-50 text-purple-700 border-purple-100',
  llibres: 'bg-orange-50 text-orange-700 border-orange-100',
  botiga: 'bg-rose-50 text-rose-700 border-rose-100',
};

const CONCEPT_LABEL: Record<ConceptKey, string> = {
  ...PAYMENT_CONCEPT_LABELS,
  botiga: 'Tienda',
};

const SELECT_CLASS =
  'px-4 py-2 border border-neutral-200 rounded-lg bg-white font-medium text-neutral-800 focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 outline-none transition-colors';

const money = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;

const dateEs = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-ES') : '');

/** Every concept a family owes something on, shop included. */
function debtsByConcept(family: FamilyAccount): Array<[ConceptKey, number]> {
  const totals = new Map<ConceptKey, number>();
  for (const child of family.children) {
    for (const { value } of PAYMENT_CONCEPTS) {
      const pending = child.concepts[value]?.pending ?? 0;
      if (pending > 0) totals.set(value, (totals.get(value) ?? 0) + pending);
    }
  }
  if (family.shop.pending > 0) totals.set('botiga', family.shop.pending);
  return [...totals.entries()];
}

function StatusPill({ family }: { family: FamilyAccount }) {
  if (family.pending <= 0) {
    return <span className="text-[11px] px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200 font-medium">Al día</span>;
  }
  if (family.overdue) {
    return <span className="text-[11px] px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200 font-medium">Vencido</span>;
  }
  return <span className="text-[11px] px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 font-medium">Pendiente</span>;
}

function ConceptCell({ status }: { status: ConceptStatus }) {
  if (status.pending > 0) {
    return (
      <span className={status.overdue ? 'text-red-700 font-semibold' : 'text-amber-700 font-semibold'}>
        {money(status.pending)}
        {status.oldestDue && <span className="text-neutral-400 font-normal"> · desde {dateEs(status.oldestDue)}</span>}
      </span>
    );
  }
  if (status.paidCount > 0) return <span className="text-green-700">Al día</span>;
  return <span className="text-neutral-300">—</span>;
}

function ChildRow({ child }: { child: ChildAccount }) {
  return (
    <div className="py-2 border-t border-neutral-100 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold text-neutral-900">{child.name} {child.surname}</span>
        <span className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">{child.course}</span>
        {child.activities.length > 0 && (
          <span className="text-xs text-neutral-500">{child.activities.join(' · ')}</span>
        )}
        {child.pending > 0 && (
          <span className="text-xs font-semibold text-neutral-700 ml-auto">{money(child.pending)} pendiente</span>
        )}
      </div>
      <dl className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
        {PAYMENT_CONCEPTS.map(({ value, label }) => (
          <div key={value} className="flex items-baseline gap-1.5 min-w-0">
            <dt className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${CONCEPT_BADGE[value]}`}>{label}</dt>
            <dd className="truncate"><ConceptCell status={child.concepts[value]} /></dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function AccountsPage() {
  const { toast } = useToast();

  const [snapshot, setSnapshot] = useState<AccountsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<string[]>([]);
  const [academicYear, setAcademicYear] = useState('');
  const [yearsReady, setYearsReady] = useState(false);

  const [search, setSearch] = useState('');
  const [onlyDebt, setOnlyDebt] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Default to the active season, but keep every cohort that has receipts.
  useEffect(() => {
    (async () => {
      try {
        const [list, season] = await Promise.all([
          AdminAccountsService.listAcademicYears(),
          ConfigService.getSeasonConfig(),
        ]);
        if (season?.active_year && !list.includes(season.active_year)) list.unshift(season.active_year);
        setYears(list);
        setAcademicYear(season?.active_year && list.includes(season.active_year) ? season.active_year : (list[0] || ''));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se han podido cargar los cursos');
      } finally {
        setYearsReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    if (!academicYear) return;
    setLoading(true);
    try {
      setSnapshot(await AdminAccountsService.getSnapshot(academicYear));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se ha podido cargar el estado de cuentas');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear]);

  useEffect(() => {
    if (yearsReady) void load();
  }, [yearsReady, load]);

  const families = useMemo(() => {
    const rows = snapshot?.families ?? [];
    const term = search.trim().toLowerCase();
    return rows.filter(family => {
      if (onlyDebt && family.pending <= 0) return false;
      if (!term) return true;
      if (family.parentName.toLowerCase().includes(term)) return true;
      if ((family.email || '').toLowerCase().includes(term)) return true;
      return family.children.some(c => `${c.name} ${c.surname} ${c.course}`.toLowerCase().includes(term));
    });
  }, [snapshot, search, onlyDebt]);

  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const upToDate = (snapshot?.families.length ?? 0) - (snapshot?.familiesInDebt ?? 0);

  const exportCsv = () => {
    if (families.length === 0) return;
    ExportService.exportAccountsCSV(families, `estat_comptes_${academicYear || 'curs'}`);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Estado de cuentas"
        subtitle="Qué debe cada familia, por concepto y por hijo, incluida la tienda"
        icon={Wallet}
        loading={loading}
        onRefresh={load}
        actions={
          <>
            <select
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              className={SELECT_CLASS}
              aria-label="Curso"
            >
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
            <button
              type="button"
              onClick={exportCsv}
              disabled={loading || families.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 rounded-md border border-neutral-200 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <p className="text-[13px] text-neutral-500">Pendiente de cobro</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{money(snapshot?.pendingTotal ?? 0)}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <p className="text-[13px] text-neutral-500">Familias con deuda</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{snapshot?.familiesInDebt ?? 0}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <p className="text-[13px] text-neutral-500">Familias al día</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{Math.max(0, upToDate)}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Familia, hijo, curso o correo"
            className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg bg-white text-[13px] focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 outline-none transition-colors"
          />
        </div>
        <label className="flex items-center gap-2 text-[13px] text-neutral-700 select-none">
          <input
            type="checkbox"
            checked={onlyDebt}
            onChange={e => setOnlyDebt(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900/20"
          />
          Solo familias con deuda
        </label>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-100">
        {loading && (
          <div className="p-10 flex items-center justify-center gap-2 text-neutral-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Calculando…
          </div>
        )}

        {!loading && families.length === 0 && (
          <div className="p-10 text-center text-neutral-500 text-sm">
            {onlyDebt ? 'Ninguna familia debe nada en este curso.' : 'No hay recibos en este curso.'}
          </div>
        )}

        {!loading && families.map(family => {
          const open = expanded.has(family.key);
          return (
            <div key={family.key}>
              <button
                type="button"
                onClick={() => toggle(family.key)}
                aria-expanded={open}
                className="w-full text-left p-3 flex items-start gap-3 hover:bg-neutral-50 transition-colors"
              >
                <ChevronRight className={`w-4 h-4 mt-0.5 text-neutral-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-neutral-900">{family.parentName}</span>
                    {family.member && <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">Socio</span>}
                    <StatusPill family={family} />
                  </span>
                  <span className="block text-xs text-neutral-500 mt-0.5 truncate">
                    {family.children.map(c => `${c.name} (${c.course})`).join(' · ') || 'Sin hijos en este curso'}
                  </span>
                  {debtsByConcept(family).length > 0 && (
                    <span className="flex flex-wrap gap-1 mt-1.5">
                      {debtsByConcept(family).map(([concept, amount]) => (
                        <span key={concept} className={`text-[11px] px-1.5 py-0.5 rounded border ${CONCEPT_BADGE[concept]}`}>
                          {CONCEPT_LABEL[concept]} {money(amount)}
                        </span>
                      ))}
                    </span>
                  )}
                </span>

                <span className="text-right shrink-0">
                  <span className={`block font-bold ${family.pending > 0 ? 'text-neutral-900' : 'text-green-700'}`}>
                    {money(family.pending)}
                  </span>
                  {family.phone && <span className="block text-xs text-neutral-400">{family.phone}</span>}
                </span>
              </button>

              {open && (
                <div className="px-3 pb-3 pl-10 bg-neutral-50/60">
                  {family.email && <p className="text-xs text-neutral-500 pb-2">{family.email}</p>}
                  {family.children.map(child => <ChildRow key={child.key} child={child} />)}
                  {family.shop.pending > 0 && (
                    <p className="pt-2 border-t border-neutral-100 text-xs text-neutral-700">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border mr-1.5 ${CONCEPT_BADGE.botiga}`}>Tienda</span>
                      {family.shop.pendingCount} pedido(s) sin pagar · <strong>{money(family.shop.pending)}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* A pending order whose customer name matches no family: usually a name
          typed differently in the shop than on the inscription. */}
      {!loading && (snapshot?.orphanOrders.length ?? 0) > 0 && (
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <h2 className="text-[13px] font-semibold text-neutral-800">
            Pedidos de tienda sin familia ({snapshot!.orphanOrders.length})
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            El nombre del pedido no coincide con ninguna familia con recibos de este curso.
          </p>
          <ul className="mt-3 space-y-1 text-[13px]">
            {snapshot!.orphanOrders.map(order => (
              <li key={order.id} className="flex justify-between gap-3">
                <span className="text-neutral-700 truncate">{order.customerName}</span>
                <span className="text-neutral-500 shrink-0">{dateEs(order.date)} · <strong>{money(order.amount)}</strong></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AccountsPage;
