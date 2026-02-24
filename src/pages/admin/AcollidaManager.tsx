import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { Save, AlertCircle, Plus, Trash2, Clock } from 'lucide-react';

interface AcollidaRate {
    id?: string;
    horari: string;
    preu_soci_mes: string;
    preu_soci_ocasional: string | null;
    preu_no_soci_mes: string;
    preu_no_soci_ocasional: string | null;
    order_index: number;
}

export default function AcollidaManager() {
    const { t } = useTranslation();
    const [rates, setRates] = useState<AcollidaRate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchRates();
    }, []);

    const fetchRates = async () => {
        try {
            const { data, error } = await supabase
                .from('acollida_rates')
                .select('*')
                .order('order_index', { ascending: true });

            if (error) throw error;
            setRates(data || []);
        } catch (err: any) {
            console.error(err);
            setError('Error al cargar las tarifas');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRate = () => {
        const newRate: AcollidaRate = {
            horari: '',
            preu_soci_mes: '',
            preu_soci_ocasional: '',
            preu_no_soci_mes: '',
            preu_no_soci_ocasional: '',
            order_index: rates.length + 1
        };
        setRates([...rates, newRate]);
    };

    const handleRemoveRate = (index: number) => {
        setRates(rates.filter((_, i) => i !== index));
    };

    const handleChange = (index: number, field: keyof AcollidaRate, value: string) => {
        const newRates = [...rates];
        newRates[index] = { ...newRates[index], [field]: value };
        setRates(newRates);
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            // First, delete existing to replace with the current list
            const { error: delError } = await supabase
                .from('acollida_rates')
                .delete()
                .neq('horari', 'FORCE_DELETE_ALL'); // Simple way to delete all

            if (delError) throw delError;

            // Then insert new ones
            const { error: insError } = await supabase
                .from('acollida_rates')
                .insert(rates.map((r, i) => ({
                    horari: r.horari,
                    preu_soci_mes: r.preu_soci_mes,
                    preu_soci_ocasional: r.preu_soci_ocasional,
                    preu_no_soci_mes: r.preu_no_soci_mes,
                    preu_no_soci_ocasional: r.preu_no_soci_ocasional,
                    order_index: i
                })));

            if (insError) throw insError;
            alert('Cambios guardados correctamente');
        } catch (err: any) {
            console.error(err);
            setError('Error al guardar. Verifica los permisos de la tabla.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Gestión de Acogida</h1>
                    <p className="text-slate-500">Configura los horarios y precios del servicio de acogida.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/30 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    {saving ? 'Guardando...' : <><Save className="w-5 h-5" /> Guardar Cambios</>}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-800 p-4 rounded-xl mb-6 flex items-center gap-3 border border-red-200">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="p-6">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                                    <th className="pb-4 px-2">Horario</th>
                                    <th className="pb-4 px-2">Socio (Mes/Oc.)</th>
                                    <th className="pb-4 px-2">No Socio (Mes/Oc.)</th>
                                    <th className="pb-4 px-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {rates.map((rate, index) => (
                                    <tr key={index} className="group">
                                        <td className="py-4 px-2">
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                                <input
                                                    type="text"
                                                    value={rate.horari}
                                                    onChange={(e) => handleChange(index, 'horari', e.target.value)}
                                                    placeholder="Ej: 7:30H A 9H"
                                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                                                />
                                            </div>
                                        </td>
                                        <td className="py-4 px-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={rate.preu_soci_mes}
                                                    onChange={(e) => handleChange(index, 'preu_soci_mes', e.target.value)}
                                                    placeholder="Mes (64€)"
                                                    className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                                                />
                                                <input
                                                    type="text"
                                                    value={rate.preu_soci_ocasional || ''}
                                                    onChange={(e) => handleChange(index, 'preu_soci_ocasional', e.target.value)}
                                                    placeholder="Oc. (10€)"
                                                    className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                                                />
                                            </div>
                                        </td>
                                        <td className="py-4 px-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={rate.preu_no_soci_mes}
                                                    onChange={(e) => handleChange(index, 'preu_no_soci_mes', e.target.value)}
                                                    placeholder="Mes (68€)"
                                                    className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                                                />
                                                <input
                                                    type="text"
                                                    value={rate.preu_no_soci_ocasional || ''}
                                                    onChange={(e) => handleChange(index, 'preu_no_soci_ocasional', e.target.value)}
                                                    placeholder="Oc. (14€)"
                                                    className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                                                />
                                            </div>
                                        </td>
                                        <td className="py-4 px-2">
                                            <button
                                                onClick={() => handleRemoveRate(index)}
                                                className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <button
                            onClick={handleAddRate}
                            className="mt-6 w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 font-bold hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={20} />
                            {t('admin.acollidaManager.addRate')}
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-8 bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/20">
                <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                    <AlertCircle size={20} /> {t('admin.acollidaManager.adminNote.title')}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                    {t('admin.acollidaManager.adminNote.description')}
                </p>
            </div>
        </div>
    );
}
