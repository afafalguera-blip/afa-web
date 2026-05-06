import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, AlertCircle, FileText, Upload, Eye, EyeOff, Info, ListOrdered, Utensils } from 'lucide-react';
import { AdminMenjadorService, type AdminMenjadorMenu, type AdminMenjadorRate } from '../../services/admin/AdminMenjadorService';
import { ConfigService, type MenjadorInfoBlock, type MenjadorInfoConfig } from '../../services/ConfigService';
import { proxyStorageUrl } from '../../utils/storageUrl';

type Tab = 'info' | 'rates' | 'menus';
type Lang = 'ca' | 'es' | 'en';

const EMPTY_BLOCK: MenjadorInfoBlock = {
  intro: '', schedule: '', company: '', allergies: '', diets: '', how_to: '', contact: '',
};

const EMPTY_INFO: MenjadorInfoConfig = {
  translations: { ca: { ...EMPTY_BLOCK }, es: { ...EMPTY_BLOCK }, en: { ...EMPTY_BLOCK } },
};

const FIELD_LABELS: Record<keyof MenjadorInfoBlock, string> = {
  intro: 'Introducción',
  schedule: 'Horario',
  company: 'Empresa proveedora',
  allergies: 'Alergias e intolerancias',
  diets: 'Dietas especiales',
  how_to: 'Cómo se utiliza',
  contact: 'Contacto',
};

const FIELD_ROWS: { key: keyof MenjadorInfoBlock; rows: number }[] = [
  { key: 'intro', rows: 4 },
  { key: 'schedule', rows: 2 },
  { key: 'company', rows: 2 },
  { key: 'how_to', rows: 4 },
  { key: 'allergies', rows: 3 },
  { key: 'diets', rows: 3 },
  { key: 'contact', rows: 2 },
];

export default function MenjadorManager() {
  const [tab, setTab] = useState<Tab>('info');
  return (
    <div className="p-2 md:p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Utensils className="w-7 h-7 text-amber-600" /> Gestión Menjador
          </h1>
          <p className="text-slate-500">Información del servicio, tarifas y menús mensuales.</p>
        </div>
      </header>

      <nav className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        <TabButton active={tab === 'info'} onClick={() => setTab('info')} icon={<Info size={16} />}>Información</TabButton>
        <TabButton active={tab === 'rates'} onClick={() => setTab('rates')} icon={<ListOrdered size={16} />}>Tarifas</TabButton>
        <TabButton active={tab === 'menus'} onClick={() => setTab('menus')} icon={<FileText size={16} />}>Menús</TabButton>
      </nav>

      {tab === 'info' && <InfoTab />}
      {tab === 'rates' && <RatesTab />}
      {tab === 'menus' && <MenusTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors whitespace-nowrap ${
        active ? 'border-amber-500 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

// ============================================================
// INFO TAB
// ============================================================
function InfoTab() {
  const [config, setConfig] = useState<MenjadorInfoConfig>(EMPTY_INFO);
  const [activeLang, setActiveLang] = useState<Lang>('ca');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await ConfigService.getMenjadorInfoConfig();
        if (data) {
          setConfig({
            translations: {
              ca: { ...EMPTY_BLOCK, ...data.translations?.ca },
              es: { ...EMPTY_BLOCK, ...data.translations?.es },
              en: { ...EMPTY_BLOCK, ...data.translations?.en },
            },
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (field: keyof MenjadorInfoBlock, value: string) => {
    setConfig(prev => ({
      translations: {
        ...prev.translations,
        [activeLang]: { ...prev.translations[activeLang], [field]: value },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await ConfigService.upsertMenjadorInfoConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
      setError((e as Error).message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  const block = config.translations[activeLang];

  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['ca', 'es', 'en'] as Lang[]).map(l => (
            <button
              key={l}
              onClick={() => setActiveLang(l)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg uppercase ${
                activeLang === l ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-emerald-600 text-sm font-bold">Guardado ✓</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : <><Save className="w-4 h-4" /> Guardar</>}
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <p className="text-xs text-slate-500">
        Edita los textos descriptivos del servicio de menjador. Cada idioma se guarda por separado.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {FIELD_ROWS.map(({ key, rows }) => (
          <div key={key} className={key === 'intro' || key === 'how_to' ? 'lg:col-span-2' : ''}>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              {FIELD_LABELS[key]}
            </label>
            <textarea
              value={block[key]}
              onChange={e => handleChange(key, e.target.value)}
              rows={rows}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/30 text-sm"
              placeholder={FIELD_LABELS[key]}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// RATES TAB
// ============================================================
function RatesTab() {
  const [rates, setRates] = useState<AdminMenjadorRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>('ca');

  useEffect(() => {
    (async () => {
      try {
        setRates(await AdminMenjadorService.getAllRates());
      } catch (e) {
        console.error(e);
        setError('Error al cargar las tarifas');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAdd = (rateType: 'fix' | 'esporadic') => {
    setRates(prev => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        label: '',
        label_ca: '',
        label_es: '',
        label_en: '',
        rate_type: rateType,
        preu_soci: '',
        preu_no_soci: '',
        note: '',
        note_ca: '',
        note_es: '',
        note_en: '',
        order_index: prev.length,
      },
    ]);
  };

  const handleRemove = (idx: number) => {
    setRates(prev => prev.filter((_, i) => i !== idx));
  };

  const handleChange = <K extends keyof AdminMenjadorRate>(idx: number, field: K, value: AdminMenjadorRate[K]) => {
    setRates(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload = rates.map(({ id: _id, ...rest }) => rest);
      await AdminMenjadorService.replaceAllRates(payload);
      setRates(await AdminMenjadorService.getAllRates());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
      setError((e as Error).message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <section className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Tarifas</h2>
            <p className="text-xs text-slate-500">Distinguimos entre alumnado <strong>fijo</strong> (mig mes o més + 1 dia) y <strong>esporádico</strong> (días sueltos).</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {(['ca', 'es', 'en'] as Lang[]).map(l => (
                <button
                  key={l}
                  onClick={() => setActiveLang(l)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg uppercase ${activeLang === l ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}
                >
                  {l}
                </button>
              ))}
            </div>
            {saved && <span className="text-emerald-600 text-sm font-bold">Guardado ✓</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : <><Save className="w-4 h-4" /> Guardar</>}
            </button>
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        <RateGroup
          title="Alumnado fijo"
          subtitle="Mig mes o més + 1 dia"
          rates={rates}
          rateType="fix"
          activeLang={activeLang}
          onAdd={() => handleAdd('fix')}
          onChange={handleChange}
          onRemove={handleRemove}
        />

        <div className="h-px bg-slate-100 my-6" />

        <RateGroup
          title="Alumnado esporádico"
          subtitle="Días sueltos"
          rates={rates}
          rateType="esporadic"
          activeLang={activeLang}
          onAdd={() => handleAdd('esporadic')}
          onChange={handleChange}
          onRemove={handleRemove}
        />
      </div>
    </section>
  );
}

interface RateGroupProps {
  title: string;
  subtitle: string;
  rates: AdminMenjadorRate[];
  rateType: 'fix' | 'esporadic';
  activeLang: Lang;
  onAdd: () => void;
  onChange: <K extends keyof AdminMenjadorRate>(idx: number, field: K, value: AdminMenjadorRate[K]) => void;
  onRemove: (idx: number) => void;
}

function RateGroup({ title, subtitle, rates, rateType, activeLang, onAdd, onChange, onRemove }: RateGroupProps) {
  const labelKey = `label_${activeLang}` as keyof AdminMenjadorRate;
  const noteKey = `note_${activeLang}` as keyof AdminMenjadorRate;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-slate-700 text-sm">{title}</h3>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <button
          onClick={onAdd}
          className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
        >
          <Plus size={14} /> Añadir tarifa
        </button>
      </div>

      <div className="space-y-3">
        {rates.map((rate, idx) => {
          if (rate.rate_type !== rateType) return null;
          return (
            <div key={rate.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="text"
                  value={(rate[labelKey] as string) ?? ''}
                  onChange={e => onChange(idx, labelKey, e.target.value as AdminMenjadorRate[typeof labelKey])}
                  placeholder={`Etiqueta (${activeLang.toUpperCase()})`}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/30 text-sm"
                />
                <button
                  onClick={() => onRemove(idx)}
                  className="p-2 text-slate-400 hover:text-red-500"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Precio Soci</label>
                  <input
                    type="text"
                    value={rate.preu_soci}
                    onChange={e => onChange(idx, 'preu_soci', e.target.value)}
                    placeholder="Ej: 6,80 €/dia"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/30 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Precio No Soci</label>
                  <input
                    type="text"
                    value={rate.preu_no_soci}
                    onChange={e => onChange(idx, 'preu_no_soci', e.target.value)}
                    placeholder="Ej: 7,20 €/dia"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/30 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nota ({activeLang.toUpperCase()})
                </label>
                <textarea
                  value={(rate[noteKey] as string) ?? ''}
                  onChange={e => onChange(idx, noteKey, e.target.value as AdminMenjadorRate[typeof noteKey])}
                  placeholder="Aclaración opcional"
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/30 text-sm"
                />
              </div>
            </div>
          );
        })}
        {rates.filter(r => r.rate_type === rateType).length === 0 && (
          <p className="text-sm text-slate-400 italic text-center py-4">Sin tarifas</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MENUS TAB
// ============================================================
function MenusTab() {
  const [menus, setMenus] = useState<AdminMenjadorMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const refresh = async () => {
    try {
      setMenus(await AdminMenjadorService.getAllMenus());
    } catch (e) {
      console.error(e);
      setError('Error al cargar los menús');
    }
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  const handleToggle = async (menu: AdminMenjadorMenu) => {
    try {
      await AdminMenjadorService.toggleMenuActive(menu.id, !menu.is_active);
      await refresh();
    } catch (e) {
      console.error(e);
      alert('No se pudo actualizar el estado');
    }
  };

  const handleDelete = async (menu: AdminMenjadorMenu) => {
    if (!confirm(`¿Eliminar el menú "${menu.title}"?`)) return;
    try {
      await AdminMenjadorService.deleteMenu(menu);
      await refresh();
    } catch (e) {
      console.error(e);
      alert('Error al eliminar');
    }
  };

  if (loading) return <Loading />;

  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Menús publicados</h2>
          <p className="text-xs text-slate-500">Sube los menús mensuales en PDF. Solo se muestran al público los activos.</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2"
        >
          <Upload className="w-4 h-4" /> Subir menú
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {menus.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-200">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No hay menús subidos.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {menus.map(menu => (
            <li key={menu.id} className="flex items-center gap-3 py-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{menu.title}</p>
                <p className="text-xs text-slate-500">
                  {formatPeriodAdmin(menu.month, menu.year)} · {(menu.size_bytes ?? 0) > 0 ? `${((menu.size_bytes ?? 0) / 1024 / 1024).toFixed(1)} MB · ` : ''}
                  <a href={proxyStorageUrl(menu.file_url)} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">Abrir PDF</a>
                </p>
              </div>
              <button
                onClick={() => handleToggle(menu)}
                title={menu.is_active ? 'Ocultar al público' : 'Mostrar al público'}
                className={`p-2 rounded-lg ${menu.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
              >
                {menu.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
              <button
                onClick={() => handleDelete(menu)}
                title="Eliminar"
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showUpload && (
        <UploadMenuModal
          onClose={() => setShowUpload(false)}
          onUploaded={async () => {
            setShowUpload(false);
            await refresh();
          }}
        />
      )}
    </section>
  );
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatPeriodAdmin(month: number | null, year: number | null): string {
  if (!month && !year) return 'Sin período';
  if (month && year) return `${MONTH_NAMES_ES[month - 1]} ${year}`;
  if (year) return String(year);
  if (month) return MONTH_NAMES_ES[month - 1];
  return '—';
}

function UploadMenuModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const today = new Date();
  const [title, setTitle] = useState('');
  const [month, setMonth] = useState<number | ''>(today.getMonth() + 1);
  const [year, setYear] = useState<number | ''>(today.getFullYear());
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (f.type !== 'application/pdf') {
      setError('Solo se permiten archivos PDF');
      return;
    }
    setFile(f);
    if (!title) {
      const m = month && Number(month) >= 1 && Number(month) <= 12 ? MONTH_NAMES_ES[Number(month) - 1] : '';
      setTitle(`Menú ${m}${year ? ` ${year}` : ''}`.trim());
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Selecciona un archivo PDF');
      return;
    }
    if (!title.trim()) {
      setError('Indica un título');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await AdminMenjadorService.uploadMenu({
        title: title.trim(),
        month: typeof month === 'number' ? month : null,
        year: typeof year === 'number' ? year : null,
        file,
      });
      onUploaded();
    } catch (e) {
      console.error(e);
      setError((e as Error).message ?? 'Error al subir');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={uploading ? undefined : onClose} />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden">
        <header className="bg-amber-500 text-white p-5">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Upload className="w-5 h-5" /> Subir menú
          </h2>
        </header>
        <div className="p-5 space-y-4">
          {error && <ErrorBanner message={error} />}

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Menú Mayo 2026"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/30 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Mes</label>
              <select
                value={month}
                onChange={e => setMonth(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/30 text-sm"
              >
                <option value="">— Sin mes —</option>
                {MONTH_NAMES_ES.map((name, i) => (
                  <option key={i} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Año</label>
              <input
                type="number"
                min={2020}
                max={2100}
                value={year}
                onChange={e => setYear(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/30 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Archivo PDF (máx. 15 MB)</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={e => handleFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200"
            />
            {file && <p className="text-xs text-slate-500 mt-1">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
          </div>
        </div>
        <footer className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || !file}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? 'Subiendo...' : <><Upload className="w-4 h-4" /> Subir</>}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ============================================================
// SHARED
// ============================================================
function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 text-red-800 p-4 rounded-xl flex items-center gap-3 border border-red-200">
      <AlertCircle className="w-5 h-5 shrink-0" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
