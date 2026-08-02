import { useEffect, useState } from 'react';
import { BookOpen, Save, Loader2 } from 'lucide-react';
import { ConfigService, type BookPricesConfig } from '../../../services/ConfigService';
import { COURSES } from '../../../constants/courses';
import { useToast } from '../../../components/common/Toast';
import { SettingsSectionNote } from './PricingNotices';
import { useSettingsT } from './useSettingsT';

const DEFAULT_CONFIG: BookPricesConfig = {
  default: 30,
  map: { I3: 0, I4: 0, I5: 0, '1PRI': 30, '2PRI': 30, '3PRI': 30, '4PRI': 30, '5PRI': 30, '6PRI': 30 },
};

interface BooksSettingsProps {
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * Socialization-book prices per course. Read by generate_book_payments via
 * book_price_for(); a price of 0 skips that course when generating receipts.
 */
export default function BooksSettings({ onDirtyChange }: BooksSettingsProps) {
  const t = useSettingsT();
  const { toast } = useToast();

  const [config, setConfig] = useState<BookPricesConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const c = await ConfigService.getBookPricesConfig();
        if (c) setConfig({ default: c.default ?? DEFAULT_CONFIG.default, map: { ...DEFAULT_CONFIG.map, ...(c.map || {}) } });
      } catch (e) {
        console.error(e);
        toast.error(t('admin.settings.books.load_error', 'Error carregant els preus de llibres'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (next: BookPricesConfig) => {
    setConfig(next);
    onDirtyChange?.(true);
  };

  const setPrice = (code: string, value: number) => patch({ ...config, map: { ...config.map, [code]: value } });

  const handleSave = async () => {
    setSaving(true);
    try {
      await ConfigService.updateBookPricesConfig(config);
      onDirtyChange?.(false);
      toast.success(t('admin.settings.books.saved', 'Preus de llibres guardats'));
    } catch (e) {
      console.error(e);
      toast.error(t('admin.settings.books.save_error', 'Error guardant els preus de llibres'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsSectionNote
        title={t('admin.settings.books.note_title', 'Llibres de socialització')}
        body={t(
          'admin.settings.books.note_body',
          "Afecta només els rebuts que es creen amb «Generar cobraments de llibres» a Cobraments: un rebut per alumne segons el seu curs. Un preu de 0 deixa el curs fora."
        )}
        consumedBy="generate_book_payments → book_price_for"
      />

      <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-neutral-100 border border-neutral-200 p-2 rounded-lg">
            <BookOpen className="w-5 h-5 text-neutral-700" />
          </div>
          <div>
            <h3 className="font-bold text-base text-neutral-900">
              {t('admin.settings.books.title', 'Preus de llibres de socialització')}
            </h3>
            <p className="text-sm text-neutral-500">
              {t('admin.settings.books.subtitle', 'Import per curs escolar.')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COURSES.map(({ code, label }) => (
            <div key={code} className="space-y-1.5">
              <span className="text-xs font-medium text-neutral-500">{label}</span>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={config.map[code] ?? 0}
                  onChange={(e) => setPrice(code, Number(e.target.value))}
                  className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">€</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-neutral-100 pt-5 space-y-1.5 max-w-xs">
          <span className="text-xs font-medium text-neutral-500">
            {t('admin.settings.books.default_price', 'Preu per defecte (cursos no llistats)')}
          </span>
          <div className="relative">
            <input
              type="number"
              min={0}
              step="0.01"
              value={config.default}
              onChange={(e) => patch({ ...config, default: Number(e.target.value) })}
              className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">€</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Save size={16} /> {t('admin.settings.books.save', 'Guardar preus')}
          </>
        )}
      </button>
    </div>
  );
}
