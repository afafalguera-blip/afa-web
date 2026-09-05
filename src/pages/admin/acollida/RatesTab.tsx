import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, AlertCircle, Plus, Trash2, Clock, Search } from 'lucide-react';
import {
    AdminAcollidaService,
    AcollidaRateInUseError,
    newAcollidaDraftId,
    isPersistedId,
    type AcollidaRate,
    type AcollidaRateDraft
} from '../../../services/admin/AdminAcollidaService';
import { useToast } from '../../../components/common/Toast';
import { useConfirm } from '../../../components/common/ConfirmDialog';
import { useDirtyGuard } from '../../../hooks/useDirtyGuard';

const snapshot = (rates: AcollidaRateDraft[]) => JSON.stringify(rates);

/** '' -> null (an occasional price that is simply not offered), '4,5' -> 4.5. */
const toPrice = (raw: string): number | null => {
    const clean = raw.replace(',', '.').trim();
    if (clean === '') return null;
    const value = Number(clean);
    return Number.isFinite(value) ? value : null;
};

const priceInput =
    'w-20 sm:w-24 px-2 sm:px-3 py-1.5 sm:py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900/10';

export function RatesTab() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const confirm = useConfirm();

    const [rates, setRates] = useState<AcollidaRateDraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    // Ids present in the DB when the editor loaded: the only rows saveAll may delete.
    const loadedIds = useRef<string[]>([]);
    const [baseline, setBaseline] = useState<string>('[]');

    const isDirty = snapshot(rates) !== baseline;
    useDirtyGuard(isDirty);

    const applyLoaded = (data: AcollidaRate[]) => {
        loadedIds.current = data.map(r => r.id);
        setBaseline(snapshot(data));
        setRates(data);
    };

    const fetchRates = useCallback(async () => {
        setLoading(true);
        try {
            applyLoaded(await AdminAcollidaService.getAll());
            setError(null);
        } catch (err) {
            console.error(err);
            setError(t('admin.acollida.error_load', 'Error en carregar les tarifes'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchRates();
    }, [fetchRates]);

    const handleAddRate = () => {
        setRates(prev => [
            ...prev,
            {
                id: newAcollidaDraftId(),
                horari: '',
                preu_soci_mes: 0,
                preu_soci_ocasional: null,
                preu_no_soci_mes: 0,
                preu_no_soci_ocasional: null,
                active: true,
                // Morning by default: it is where all but the June/September
                // slots live, and the group decides which seats the slot shares.
                capacity_group: 'mati',
                order_index: prev.length
            }
        ]);
        setSearch('');
    };

    const handleRemoveRate = async (rate: AcollidaRateDraft) => {
        // Only rows already stored are worth a confirmation: an empty new row is free to drop.
        if (isPersistedId(rate.id) || rate.horari.trim()) {
            const ok = await confirm({
                title: t('admin.acollida.delete_title', 'Eliminar tarifa'),
                message: t('admin.acollida.delete_message', "La tarifa s'eliminarà en desar els canvis."),
                itemName: rate.horari || t('admin.acollida.untitled_rate', 'Tarifa sense horari'),
                destructive: true
            });
            if (!ok) return;
        }
        setRates(prev => prev.filter(r => r.id !== rate.id));
    };

    const handleChange = <K extends keyof AcollidaRateDraft>(id: string, field: K, value: AcollidaRateDraft[K]) => {
        setRates(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const saved = await AdminAcollidaService.saveAll(rates, loadedIds.current);
            applyLoaded(saved);
            toast.success(t('admin.acollida.saved', 'Tarifes desades correctament'));
        } catch (err) {
            console.error(err);
            // Borrar una tarifa amb sol·licituds deixaria aquelles famílies sense
            // preu. Es diu què cal fer en comptes de deixar un error tècnic.
            const message =
                err instanceof AcollidaRateInUseError
                    ? t('admin.acollida.error_in_use', {
                          count: err.count,
                          defaultValue: 'Aquesta franja té {{count}} sol·licituds. Desmarca «Activa» per deixar d\'oferir-la en comptes d\'esborrar-la.'
                      })
                    : t('admin.acollida.error_save', 'Error en desar. Comprova els permisos de la taula.');
            setError(message);
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const visibleRates = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rates;
        return rates.filter(r =>
            [r.horari, r.preu_soci_mes, r.preu_soci_ocasional, r.preu_no_soci_mes, r.preu_no_soci_ocasional]
                .some(v => String(v ?? '').toLowerCase().includes(term))
        );
    }, [rates, search]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                {isDirty && !loading ? (
                    <p className="text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                        {t('admin.unsaved.banner', 'Tens canvis sense desar.')}
                    </p>
                ) : (
                    <span />
                )}
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-admin-accent hover:bg-admin-accent-hover text-white text-[13px] font-medium transition-colors disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {saving ? t('common.saving') : t('common.save')}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-center gap-3 border border-red-200">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
                    <div className="p-4 border-b border-neutral-100 bg-neutral-50/60">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={t('admin.acollida.search_placeholder', 'Cerca per horari o preu...')}
                                aria-label={t('admin.acollida.search_placeholder', 'Cerca per horari o preu...')}
                                className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg bg-white text-[13px] outline-none focus:ring-2 focus:ring-neutral-900/10"
                            />
                        </div>
                    </div>

                    <div className="p-3 sm:p-6 overflow-x-auto">
                        <table className="w-full min-w-[560px]">
                            <thead>
                                <tr className="text-left text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100">
                                    <th className="pb-4 px-2">{t('admin.acollida.col_schedule', 'Horari')}</th>
                                    <th className="pb-4 px-2">{t('admin.acollida.col_member', 'Soci (Mes/Oc.)')}</th>
                                    <th className="pb-4 px-2">{t('admin.acollida.col_non_member', 'No soci (Mes/Oc.)')}</th>
                                    <th className="pb-4 px-2">{t('admin.acollida.col_active', 'Activa')}</th>
                                    <th className="pb-4 px-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {visibleRates.map(rate => (
                                    <tr key={rate.id} className="group">
                                        <td className="py-3 sm:py-4 px-2">
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                                                <input
                                                    type="text"
                                                    value={rate.horari}
                                                    onChange={e => handleChange(rate.id!, 'horari', e.target.value)}
                                                    placeholder={t('admin.acollida.schedule_placeholder', 'Ex: 7:30H A 9H')}
                                                    aria-label={t('admin.acollida.col_schedule', 'Horari')}
                                                    className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900/10"
                                                />
                                            </div>
                                        </td>
                                        <td className="py-3 sm:py-4 px-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={rate.preu_soci_mes ?? ''}
                                                    onChange={e => handleChange(rate.id!, 'preu_soci_mes', toPrice(e.target.value) ?? 0)}
                                                    placeholder={t('admin.acollida.month_placeholder', 'Mes')}
                                                    aria-label={t('admin.acollida.member_month', 'Soci — mes')}
                                                    className={priceInput}
                                                />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={rate.preu_soci_ocasional ?? ''}
                                                    onChange={e => handleChange(rate.id!, 'preu_soci_ocasional', toPrice(e.target.value))}
                                                    placeholder={t('admin.acollida.occasional_placeholder', 'Oc.')}
                                                    aria-label={t('admin.acollida.member_occasional', 'Soci — ocasional')}
                                                    className={priceInput}
                                                />
                                            </div>
                                        </td>
                                        <td className="py-3 sm:py-4 px-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={rate.preu_no_soci_mes ?? ''}
                                                    onChange={e => handleChange(rate.id!, 'preu_no_soci_mes', toPrice(e.target.value) ?? 0)}
                                                    placeholder={t('admin.acollida.month_placeholder_alt', 'Mes')}
                                                    aria-label={t('admin.acollida.non_member_month', 'No soci — mes')}
                                                    className={priceInput}
                                                />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={rate.preu_no_soci_ocasional ?? ''}
                                                    onChange={e => handleChange(rate.id!, 'preu_no_soci_ocasional', toPrice(e.target.value))}
                                                    placeholder={t('admin.acollida.occasional_placeholder_alt', 'Oc.')}
                                                    aria-label={t('admin.acollida.non_member_occasional', 'No soci — ocasional')}
                                                    className={priceInput}
                                                />
                                            </div>
                                        </td>
                                        <td className="py-3 sm:py-4 px-2">
                                            <label className="inline-flex items-center gap-2 text-[13px] text-neutral-600">
                                                <input
                                                    type="checkbox"
                                                    checked={rate.active}
                                                    onChange={e => handleChange(rate.id!, 'active', e.target.checked)}
                                                    className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
                                                />
                                                <span className="sr-only sm:not-sr-only">
                                                    {rate.active
                                                        ? t('admin.acollida.active_yes', 'Oferta')
                                                        : t('admin.acollida.active_no', 'Amagada')}
                                                </span>
                                            </label>
                                        </td>
                                        <td className="py-3 sm:py-4 px-2">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveRate(rate)}
                                                aria-label={t('common.delete')}
                                                className="p-2 text-neutral-300 hover:text-red-600 transition-colors focus:opacity-100 opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {visibleRates.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-10 text-center text-sm text-neutral-500">
                                            {search
                                                ? t('common.no_results', 'Sense resultats')
                                                : t('admin.acollida.empty', 'Encara no hi ha tarifes.')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <button
                            type="button"
                            onClick={handleAddRate}
                            className="mt-4 sm:mt-6 w-full py-3 sm:py-4 border-2 border-dashed border-neutral-200 rounded-lg text-neutral-400 text-sm sm:text-base font-bold hover:border-neutral-900 hover:text-neutral-900 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={20} />
                            {t('admin.acollidaManager.addRate')}
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-blue-50 p-4 sm:p-6 rounded-lg border border-blue-100">
                <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                    <AlertCircle size={20} /> {t('admin.acollidaManager.adminNote.title')}
                </h3>
                <p className="text-sm text-blue-700 leading-relaxed">
                    {t('admin.acollida.rates_note', "Els preus són en euros i sense símbol: el formulari els ensenya a les famílies i el generador de rebuts els cobra tal com estan aquí.")}
                </p>
            </div>
        </div>
    );
}

export default RatesTab;
