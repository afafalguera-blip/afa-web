import { useEffect, useState } from 'react';
import { BookOpen, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ConfigService, type BookPricesConfig } from '../../../services/ConfigService';

// Course codes as stored by the public inscription form, with a friendly label.
const COURSES: { code: string; label: string }[] = [
  { code: 'I3', label: 'I3 (Infantil)' },
  { code: 'I4', label: 'I4 (Infantil)' },
  { code: 'I5', label: 'I5 (Infantil)' },
  { code: '1PRI', label: '1r Primària' },
  { code: '2PRI', label: '2n Primària' },
  { code: '3PRI', label: '3r Primària' },
  { code: '4PRI', label: '4t Primària' },
  { code: '5PRI', label: '5è Primària' },
  { code: '6PRI', label: '6è Primària' },
];

const DEFAULT_CONFIG: BookPricesConfig = {
  default: 30,
  map: { I3: 0, I4: 0, I5: 0, '1PRI': 30, '2PRI': 30, '3PRI': 30, '4PRI': 30, '5PRI': 30, '6PRI': 30 },
};

/**
 * Self-contained panel for socialization-book prices per course.
 * Read by generate_book_payments (via book_price_for). A price of 0 means the
 * course is skipped when generating the receipts.
 */
export default function BooksSettings() {
  const [config, setConfig] = useState<BookPricesConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const c = await ConfigService.getBookPricesConfig();
        if (c) setConfig({ default: c.default ?? DEFAULT_CONFIG.default, map: { ...DEFAULT_CONFIG.map, ...(c.map || {}) } });
      } catch (e) {
        console.error(e);
        setError('Error carregant els preus de llibres');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setPrice = (code: string, value: number) =>
    setConfig({ ...config, map: { ...config.map, [code]: value } });

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      await ConfigService.updateBookPricesConfig(config);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      setError('Error guardant els preus de llibres');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-neutral-900 dark:text-white">Preus de llibres de socialització</h3>
            <p className="text-sm text-neutral-500">
              Preu per curs. Amb «Generar cobraments de llibres» es crea un rebut per alumne segons el seu curs. Un preu de 0 el deixa fora.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COURSES.map(({ code, label }) => (
            <div key={code} className="space-y-1.5">
              <span className="text-xs font-medium text-neutral-500">{label}</span>
              <div className="relative">
                <input
                  type="number" min={0} step="0.01"
                  value={config.map[code] ?? 0}
                  onChange={(e) => setPrice(code, Number(e.target.value))}
                  className="h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">€</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-5 space-y-1.5 max-w-xs">
          <span className="text-xs font-medium text-neutral-500">Preu per defecte (cursos no llistats)</span>
          <div className="relative">
            <input
              type="number" min={0} step="0.01"
              value={config.default}
              onChange={(e) => setConfig({ ...config, default: Number(e.target.value) })}
              className="h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">€</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg">
          <AlertCircle size={20} />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-100 border border-green-200 text-green-700 rounded-lg">
          <CheckCircle2 size={20} />
          <p className="font-medium text-sm">Preus de llibres guardats!</p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-3 shadow-sm shadow-primary/30 transition-all disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save size={20} /> Guardar preus</>}
      </button>
    </div>
  );
}
