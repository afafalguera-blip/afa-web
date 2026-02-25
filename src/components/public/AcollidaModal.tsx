import { X, Clock, Users, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';

import { useContentTranslation } from '../../hooks/useContentTranslation';

interface AcollidaRate {
    horari: string;
    horari_ca?: string;
    horari_es?: string;
    horari_en?: string;
    preu_soci_mes: string;
    preu_soci_ocasional: string | null;
    preu_no_soci_mes: string;
    preu_no_soci_ocasional: string | null;
}

interface AcollidaModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AcollidaModal({ isOpen, onClose }: AcollidaModalProps) {
    const { t } = useTranslation();
    const { tContent } = useContentTranslation();
    const [rates, setRates] = useState<AcollidaRate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchRates();
        }
    }, [isOpen]);

    const fetchRates = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('acollida_rates')
                .select('*')
                .order('order_index', { ascending: true });

            if (error) throw error;
            if (data) {
                setRates(data);
            }
        } catch (err) {
            console.error('Error fetching acollida rates:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 10 }}
                        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative z-10 mx-auto"
                    >
                        {/* Header Compacto */}
                        <div className="bg-primary p-4 md:p-5 text-white relative">
                            <button
                                onClick={onClose}
                                className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X size={18} />
                            </button>
                            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                                <Users className="w-5 h-5 md:w-6 md:h-6" />
                                {t('inscription.acollida_modal.title')}
                            </h2>
                            <p className="text-white/80 mt-0.5 text-xs md:text-sm">{t('inscription.acollida_modal.subtitle')}</p>
                        </div>

                        <div className="p-3 md:p-5">
                            {loading ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Desktop Table - More Compact */}
                                    <div className="hidden md:block">
                                        <table className="w-full border-separate border-spacing-0">
                                            <thead>
                                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                                    <th className="py-2 px-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider w-1/4">
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock size={12} />
                                                            {t('inscription.acollida_modal.horari')}
                                                        </div>
                                                    </th>
                                                    <th className="py-2 px-3 text-center text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/5 rounded-t-lg">
                                                        {t('inscription.acollida_modal.price_member')}
                                                    </th>
                                                    <th className="py-2 px-3 text-center text-[10px] font-bold text-secondary uppercase tracking-wider bg-secondary/5 rounded-t-lg">
                                                        {t('inscription.acollida_modal.price_non_member')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                {rates.map((rate, index) => (
                                                    <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                        <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-200 text-xs">
                                                            {tContent(rate, 'horari')}
                                                        </td>
                                                        <td className="py-1 px-3 text-center bg-primary/5">
                                                            <div className="flex flex-row items-center justify-center gap-2.5">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-base font-black text-primary leading-none">{rate.preu_soci_mes}</span>
                                                                    <span className="text-[8px] text-primary/60 uppercase font-black tracking-tighter">{t('inscription.acollida_modal.per_month')}</span>
                                                                </div>
                                                                {rate.preu_soci_ocasional && (
                                                                    <div className="flex flex-col items-center pl-2.5 border-l border-primary/10">
                                                                        <span className="text-xs font-bold text-primary/80 leading-none">{rate.preu_soci_ocasional}</span>
                                                                        <span className="text-[8px] text-primary/60 uppercase font-bold tracking-tighter">{t('inscription.acollida_modal.occasional')}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-1 px-3 text-center bg-secondary/5">
                                                            <div className="flex flex-row items-center justify-center gap-2.5">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-base font-black text-secondary leading-none">{rate.preu_no_soci_mes}</span>
                                                                    <span className="text-[8px] text-secondary/60 uppercase font-black tracking-tighter">{t('inscription.acollida_modal.per_month')}</span>
                                                                </div>
                                                                {rate.preu_no_soci_ocasional && (
                                                                    <div className="flex flex-col items-center pl-2.5 border-l border-secondary/10">
                                                                        <span className="text-xs font-bold text-secondary/80 leading-none">{rate.preu_no_soci_ocasional}</span>
                                                                        <span className="text-[8px] text-secondary/60 uppercase font-bold tracking-tighter">{t('inscription.acollida_modal.occasional')}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards - Compact and Fixed */}
                                    <div className="md:hidden space-y-2">
                                        {rates.map((rate, index) => (
                                            <div key={index} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-1.5 mb-2 text-slate-900 dark:text-white font-black border-b border-slate-200 dark:border-slate-700 pb-1 text-[10px] uppercase">
                                                    <Clock size={12} className="text-primary" />
                                                    {tContent(rate, 'horari')}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-primary/5 rounded-lg p-1.5 flex flex-col items-center">
                                                        <span className="text-[7px] font-black text-primary uppercase tracking-widest mb-0.5">{t('inscription.acollida_modal.price_member')}</span>
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-sm font-black text-primary leading-none">{rate.preu_soci_mes}</span>
                                                            <span className="text-[7px] text-primary/60 font-bold uppercase">{t('inscription.acollida_modal.per_month')}</span>
                                                            {rate.preu_soci_ocasional && (
                                                                <div className="mt-1 pt-1 border-t border-primary/10 w-full flex flex-col items-center">
                                                                    <span className="text-[10px] font-bold text-primary leading-none">{rate.preu_soci_ocasional}</span>
                                                                    <span className="text-[7px] text-primary/60 font-medium uppercase">{t('inscription.acollida_modal.occasional')}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="bg-secondary/5 rounded-lg p-1.5 flex flex-col items-center">
                                                        <span className="text-[7px] font-black text-secondary uppercase tracking-widest mb-0.5">{t('inscription.acollida_modal.price_non_member')}</span>
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-sm font-black text-secondary leading-none">{rate.preu_no_soci_mes}</span>
                                                            <span className="text-[7px] text-secondary/60 font-bold uppercase">{t('inscription.acollida_modal.per_month')}</span>
                                                            {rate.preu_no_soci_ocasional && (
                                                                <div className="mt-1 pt-1 border-t border-secondary/10 w-full flex flex-col items-center">
                                                                    <span className="text-[10px] font-bold text-secondary leading-none">{rate.preu_no_soci_ocasional}</span>
                                                                    <span className="text-[7px] text-secondary/60 font-medium uppercase">{t('inscription.acollida_modal.occasional')}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20 flex gap-2">
                                <Calendar className="text-amber-500 w-4 h-4 shrink-0 mt-0.5" />
                                <p className="text-[9px] md:text-[10px] text-amber-800 dark:text-amber-200 leading-tight">
                                    {t('inscription.acollida_modal.footer_note')}
                                </p>
                            </div>
                        </div>

                        <div className="p-3 md:p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-5 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                                {t('common.close')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
