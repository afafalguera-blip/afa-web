import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X
} from 'lucide-react';
import {
  AdminShortUrlsService,
  getShortLinkBaseUrl,
  normalizeSlug,
  type ShortUrl,
  type ShortUrlFormData
} from '../../services/admin/AdminShortUrlsService';
import { toDateTimeLocalInputValue } from '../../utils/dateTime';

const createDefaultFormData = (): ShortUrlFormData => ({
  slug: '',
  target_url: '',
  description: '',
  expires_at: ''
});

const toErrorMessage = (error: unknown): string => {
  const maybeError = error as { code?: string };
  if (maybeError.code === '23505') return 'Ese slug ya existe. Elige otro.';

  if (error instanceof Error) {
    if (error.message === 'SLUG_REQUIRED') return 'El slug es obligatorio.';
    if (error.message === 'SLUG_INVALID') return 'El slug solo puede contener letras minúsculas, números y guiones.';
    if (error.message === 'TARGET_URL_REQUIRED') return 'La URL de destino es obligatoria.';
    if (error.message === 'TARGET_URL_INVALID') return 'La URL de destino no es válida.';
    return error.message || 'Se ha producido un error.';
  }

  return 'Se ha producido un error.';
};

const isExpired = (expiresAt: string | null): boolean => {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt);
  return !Number.isNaN(expiry.getTime()) && expiry.getTime() <= Date.now();
};

const formatDateTime = (value: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function ShortLinksManager() {
  const [links, setLinks] = useState<ShortUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState<ShortUrlFormData>(() => createDefaultFormData());

  const shortBaseUrl = getShortLinkBaseUrl();

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminShortUrlsService.getAll();
      setLinks(data);
    } catch (error) {
      console.error('Error fetching short links:', error);
      alert(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const resetForm = () => {
    setEditingId(null);
    setFormData(createDefaultFormData());
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await AdminShortUrlsService.save(formData, editingId || undefined);
      resetForm();
      await fetchLinks();
    } catch (error) {
      console.error('Error saving short link:', error);
      alert(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: ShortUrl) => {
    setEditingId(item.id);
    setFormData({
      slug: item.slug,
      target_url: item.target_url,
      description: item.description || '',
      expires_at: toDateTimeLocalInputValue(item.expires_at)
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que quieres eliminar este enlace corto?')) return;
    try {
      await AdminShortUrlsService.delete(id);
      setLinks((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
    } catch (error) {
      console.error('Error deleting short link:', error);
      alert(toErrorMessage(error));
    }
  };

  const handleCopy = async (slug: string) => {
    if (!shortBaseUrl) {
      alert('Falta configurar la base de enlaces cortos.');
      return;
    }

    const shortUrl = `${shortBaseUrl}/${slug}`;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedSlug(slug);
      window.setTimeout(() => {
        setCopiedSlug((current) => (current === slug ? null : current));
      }, 1800);
    } catch (error) {
      console.error('Error copying short link:', error);
      alert('No se pudo copiar el enlace al portapapeles.');
    }
  };

  const filteredLinks = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return links;

    return links.filter((item) => {
      const haystack = `${item.slug} ${item.target_url} ${item.description || ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [links, searchText]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Enlaces cortos</h1>
          <p className="text-slate-500">Crea y gestiona redirecciones cortas para campañas, PDFs y recursos.</p>
          <p className="text-xs text-slate-400 mt-1">
            Base de enlace corto: <span className="font-mono">{shortBaseUrl || 'No configurada'}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={fetchLinks}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Recargar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-semibold">
          <Plus className="w-4 h-4" />
          {editingId ? 'Editar enlace corto' : 'Nuevo enlace corto'}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Slug</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(event) => setFormData((prev) => ({ ...prev, slug: normalizeSlug(event.target.value) }))}
              placeholder="santjordi"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none font-mono text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expira el (opcional)</label>
            <input
              type="datetime-local"
              value={formData.expires_at}
              onChange={(event) => setFormData((prev) => ({ ...prev, expires_at: event.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">URL de destino</label>
          <input
            type="url"
            value={formData.target_url}
            onChange={(event) => setFormData((prev) => ({ ...prev, target_url: event.target.value }))}
            placeholder="https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/public/..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Descripción interna</label>
          <textarea
            value={formData.description}
            onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Cartel Sant Jordi 2026 (PDF)"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none min-h-[88px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear enlace'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar por slug, destino o descripción..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando enlaces...</div>
        ) : filteredLinks.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay enlaces para mostrar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Slug</th>
                  <th className="text-left px-4 py-3">Descripción</th>
                  <th className="text-left px-4 py-3">Clicks</th>
                  <th className="text-left px-4 py-3">Creado</th>
                  <th className="text-left px-4 py-3">Expira</th>
                  <th className="text-right px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredLinks.map((item) => {
                  const expired = isExpired(item.expires_at);
                  const shortUrl = shortBaseUrl ? `${shortBaseUrl}/${item.slug}` : item.slug;

                  return (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 align-top">
                        <div className="font-mono font-semibold text-slate-900">{item.slug}</div>
                        <a
                          href={shortUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline break-all"
                        >
                          {shortUrl}
                        </a>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700">
                        {item.description || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
                          {item.clicks}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-600">{formatDateTime(item.created_at)}</td>
                      <td className="px-4 py-3 align-top">
                        {item.expires_at ? (
                          <span className={expired ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                            {formatDateTime(item.expires_at)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(item.slug)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                            title="Copiar enlace corto"
                          >
                            {copiedSlug === item.slug ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
