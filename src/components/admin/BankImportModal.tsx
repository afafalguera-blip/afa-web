import { useRef, useState } from 'react';
import { X, UploadCloud, Loader2, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { parseN43, type N43Movement } from '../../utils/n43';
import {
  BankReconciliationService as Recon,
  sha256Hex,
  type ReconRow,
  type PendingPayment,
} from '../../services/admin/BankReconciliationService';
import { PAYMENT_CONCEPT_LABELS, type PaymentConcept } from '../../types/payment';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplied: () => void;
}

type Stage = 'idle' | 'loading' | 'review' | 'applying' | 'done';

const conceptLabel = (c: string) => PAYMENT_CONCEPT_LABELS[c as PaymentConcept] ?? c;
const money = (n: number) => `${Number(n).toFixed(2)}€`;
const payLabel = (p: PendingPayment) =>
  `${(p.parent_name || '—')} · ${p.student_name} ${p.student_surname} · ${conceptLabel(p.concept)} · ${money(p.amount)}`;

export function BankImportModal({ isOpen, onClose, onApplied }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileHash, setFileHash] = useState('');
  const [priorImport, setPriorImport] = useState<{ imported_at: string; applied_count: number } | null>(null);

  const [rows, setRows] = useState<ReconRow[]>([]);
  const [allPending, setAllPending] = useState<PendingPayment[]>([]);
  const [paymentsById, setPaymentsById] = useState<Map<string, PendingPayment>>(new Map());
  const [selected, setSelected] = useState<Record<number, string[]>>({});
  const [movTotal, setMovTotal] = useState(0);
  const [movIncome, setMovIncome] = useState(0);
  const [appliedCount, setAppliedCount] = useState(0);

  const reset = () => {
    setStage('idle'); setError(null); setFileName(''); setFileHash(''); setPriorImport(null);
    setRows([]); setAllPending([]); setPaymentsById(new Map()); setSelected({});
    setMovTotal(0); setMovIncome(0); setAppliedCount(0);
  };

  const close = () => { reset(); onClose(); };

  const handleFile = async (file: File) => {
    setError(null);
    setStage('loading');
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      // Sabadell N43 is ISO-8859-1; decode accordingly so Ñ/accents survive.
      const text = new TextDecoder('iso-8859-1').decode(buffer);
      const movements: N43Movement[] = parseN43(text);
      if (movements.length === 0) throw new Error('No se han encontrado movimientos. ¿Es un fichero Norma 43 válido?');

      const hash = await sha256Hex(buffer);
      const [prior, ctx] = await Promise.all([Recon.findImport(hash), Recon.loadContext()]);
      const reconRows = Recon.reconcile(movements, ctx.payments, ctx.aliases);

      const byId = new Map(ctx.payments.map(p => [p.id, p]));
      const initSel: Record<number, string[]> = {};
      reconRows.forEach((r, i) => { initSel[i] = [...r.suggestedPaymentIds]; });

      setFileHash(hash);
      setPriorImport(prior);
      setRows(reconRows);
      setAllPending(ctx.payments);
      setPaymentsById(byId);
      setSelected(initSel);
      setMovTotal(movements.length);
      setMovIncome(movements.filter(m => m.isIncome).length);
      setStage('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage('idle');
    }
  };

  const togglePayment = (rowIdx: number, id: string) => {
    setSelected(prev => {
      const cur = prev[rowIdx] || [];
      return { ...prev, [rowIdx]: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] };
    });
  };

  const setSingle = (rowIdx: number, id: string) => {
    setSelected(prev => ({ ...prev, [rowIdx]: id ? [id] : [] }));
  };

  const selectedTotal = Object.values(selected).reduce((a, ids) => a + ids.length, 0);

  const apply = async () => {
    setStage('applying');
    setError(null);
    try {
      const selections = rows
        .map((row, idx) => {
          const ids = selected[idx] || [];
          const parentName = row.parentName
            ?? (ids[0] ? paymentsById.get(ids[0])?.parent_name ?? null : null);
          return { movement: row.movement, paymentIds: ids, parentName };
        })
        .filter(s => s.paymentIds.length > 0);

      const matchedCount = rows.filter(r => r.confidence === 'high').length;
      const applied = await Recon.apply(selections, {
        fileHash, filename: fileName, movementsTotal: movTotal, movementsIncome: movIncome, matchedCount,
      });
      setAppliedCount(applied);
      setStage('done');
      onApplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage('review');
    }
  };

  if (!isOpen) return null;

  const highN = rows.filter(r => r.confidence === 'high').length;
  const medN = rows.filter(r => r.confidence === 'medium').length;
  const unN = rows.filter(r => r.confidence === 'unmatched').length;

  const badge = (c: ReconRow['confidence']) => {
    const map = {
      high: 'bg-green-50 text-green-700 border-green-200',
      medium: 'bg-amber-50 text-amber-700 border-amber-200',
      unmatched: 'bg-neutral-100 text-neutral-500 border-neutral-200',
    } as const;
    const label = { high: 'Alta', medium: 'Revisar', unmatched: 'Sin match' }[c];
    return <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${map[c]}`}>{label}</span>;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl flex flex-col max-h-[92vh]">
        <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-lg z-10">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Importar extracto (Norma 43)</h2>
            <p className="text-sm text-neutral-500">Concilia transferencias recibidas con los recibos pendientes.</p>
          </div>
          <button onClick={close} className="text-neutral-400 hover:text-neutral-600"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 bg-red-50 text-red-800 border-l-4 border-red-500 p-3 rounded-r-lg flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {(stage === 'idle' || stage === 'loading') && (
            <div>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={stage === 'loading'}
                className="w-full border-2 border-dashed border-neutral-300 rounded-xl p-10 flex flex-col items-center gap-3 text-neutral-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-60"
              >
                {stage === 'loading'
                  ? <><Loader2 className="w-8 h-8 animate-spin" /><span>Procesando {fileName}…</span></>
                  : <><UploadCloud className="w-8 h-8" /><span className="font-medium">Selecciona el fichero .n43 / .txt</span>
                      <span className="text-xs text-neutral-400">Exporta desde BS Online como Norma 43 / Cuaderno 43</span></>}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".n43,.txt,text/plain"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
              />
            </div>
          )}

          {(stage === 'review' || stage === 'applying') && (
            <div className="space-y-4">
              {priorImport && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Este fichero ya se importó el {new Date(priorImport.imported_at).toLocaleDateString('es-ES')} ({priorImport.applied_count} recibos). Los recibos ya pagados no volverán a aparecer.
                </div>
              )}

              <div className="flex flex-wrap gap-3 text-sm">
                <span className="flex items-center gap-1 text-neutral-600"><FileText className="w-4 h-4" /> {fileName}</span>
                <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">{movIncome} ingresos de {movTotal} mov.</span>
                <span className="px-2 py-0.5 rounded bg-green-50 text-green-700">Alta: {highN}</span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700">Revisar: {medN}</span>
                <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-500">Sin match: {unN}</span>
              </div>

              <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100">
                {rows.map((row, idx) => {
                  const sel = selected[idx] || [];
                  return (
                    <div key={idx} className="p-3 flex flex-col md:flex-row md:items-start gap-3">
                      <div className="md:w-64 shrink-0">
                        <div className="flex items-center gap-2">
                          {badge(row.confidence)}
                          <span className="font-semibold text-neutral-900">{money(row.movement.amount)}</span>
                        </div>
                        <div className="text-sm text-neutral-700 mt-1">{row.movement.payerName || '—'}</div>
                        <div className="text-xs text-neutral-400">{row.movement.date} · {row.note}</div>
                      </div>

                      <div className="flex-1 min-w-0">
                        {row.candidatePayments.length > 0 ? (
                          <div className="space-y-1">
                            {row.candidatePayments.map(p => (
                              <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-neutral-50 rounded px-1 py-0.5">
                                <input
                                  type="checkbox"
                                  checked={sel.includes(p.id)}
                                  onChange={() => togglePayment(idx, p.id)}
                                  className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className={sel.includes(p.id) ? 'text-neutral-900' : 'text-neutral-600'}>
                                  {p.student_name} {p.student_surname} · {conceptLabel(p.concept)} · {String(p.payment_month).padStart(2, '0')}/{p.payment_year} · <strong>{money(p.amount)}</strong>
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <select
                            value={sel[0] || ''}
                            onChange={e => setSingle(idx, e.target.value)}
                            className="w-full text-sm px-2 py-1.5 border border-neutral-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            <option value="">— Asignar manualmente (opcional) —</option>
                            {allPending.map(p => (
                              <option key={p.id} value={p.id}>{payLabel(p)}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
                {rows.length === 0 && (
                  <div className="p-8 text-center text-neutral-500 text-sm">No hay ingresos que conciliar en este fichero.</div>
                )}
              </div>
            </div>
          )}

          {stage === 'done' && (
            <div className="py-10 text-center">
              <div className="rounded-full bg-green-100 p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">{appliedCount} recibos marcados como pagados</h3>
              <p className="text-neutral-500 mt-1">Los ordenantes confirmados se recordarán para el próximo extracto.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-neutral-50 rounded-b-lg flex justify-between items-center gap-3 sticky bottom-0">
          <div className="text-sm text-neutral-500">
            {stage === 'review' && `${selectedTotal} recibos seleccionados`}
          </div>
          <div className="flex gap-3">
            <button onClick={close} className="px-4 py-2 text-neutral-700 hover:bg-neutral-200 rounded-lg transition-colors">
              {stage === 'done' ? 'Cerrar' : 'Cancelar'}
            </button>
            {(stage === 'review' || stage === 'applying') && (
              <button
                onClick={apply}
                disabled={stage === 'applying' || selectedTotal === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {stage === 'applying' && <Loader2 className="w-4 h-4 animate-spin" />}
                Marcar {selectedTotal} como pagados
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
