import { useTranslation } from 'react-i18next';
import { X, Loader2, Upload, Save, Calendar, Tag, CreditCard, Type } from 'lucide-react';
import type { FinanceTransaction } from '../../../services/FinanceService';

interface FinanceTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    transaction: Partial<FinanceTransaction>;
    setTransaction: (t: Partial<FinanceTransaction>) => void;
    uploadFile: File | null;
    setUploadFile: (f: File | null) => void;
    isSubmitting: boolean;
}

export function FinanceTransactionModal({
    isOpen,
    onClose,
    onSubmit,
    transaction,
    setTransaction,
    uploadFile,
    setUploadFile,
    isSubmitting,
}: FinanceTransactionModalProps) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">
                            {t('admin.finances.new_transaction_title', 'Nova Transacció')}
                        </h2>
                        <p className="text-xs text-slate-500">Registra un nou moviment econòmic</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={onSubmit} className="p-6 space-y-5">
                    {/* Type & Date Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5">
                                <CreditCard className="w-3 h-3" /> {t('admin.finances.type', 'Tipus')}
                            </label>
                            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                                {(['income', 'expense'] as const).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setTransaction({ ...transaction, type })}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${transaction.type === type
                                                ? type === 'income'
                                                    ? 'bg-emerald-500 text-white shadow-sm'
                                                    : 'bg-rose-500 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                            }`}
                                    >
                                        {t(`admin.finances.${type}`, type.toUpperCase())}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" /> {t('admin.finances.date', 'Data')}
                            </label>
                            <input
                                type="date"
                                required
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                value={transaction.date}
                                onChange={e => setTransaction({ ...transaction, date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5">
                            <Type className="w-3 h-3" /> {t('admin.finances.description_label', 'Descripció')}
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: Pagament botiga, Subvenció AFA..."
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                            value={transaction.description}
                            onChange={e => setTransaction({ ...transaction, description: e.target.value })}
                        />
                    </div>

                    {/* Amount & Category Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5">
                                {transaction.type === 'income' ? '+' : '-'} {t('admin.finances.amount', 'Import (€)')}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 outline-none transition-all dark:text-white ${transaction.type === 'income' ? 'focus:ring-emerald-500' : 'focus:ring-rose-500'
                                    }`}
                                value={transaction.amount}
                                onChange={e => setTransaction({ ...transaction, amount: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5">
                                <Tag className="w-3 h-3" /> {t('admin.finances.category', 'Categoria')}
                            </label>
                            <input
                                type="text"
                                list="categories"
                                required
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                value={transaction.category}
                                onChange={e => setTransaction({ ...transaction, category: e.target.value })}
                            />
                            <datalist id="categories">
                                <option value="botiga">{t('admin.finances.cat_shop', 'Botiga')}</option>
                                <option value="factura">{t('admin.finances.cat_invoice', 'Factura')}</option>
                                <option value="material">{t('admin.finances.cat_supplies', 'Material')}</option>
                                <option value="subvencio">{t('admin.finances.cat_grant', 'Subvenció')}</option>
                                <option value="mensualitats">{t('admin.finances.cat_payments', 'Mensualitats')}</option>
                            </datalist>
                        </div>
                    </div>

                    {/* File Upload */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5">
                            <Upload className="w-3 h-3" /> {t('admin.finances.attachment', 'Adjuntar Factura/Rebut (PDF/Img)')}
                        </label>
                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer relative group">
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                            />
                            <div className="flex flex-col items-center gap-2 group-hover:scale-105 transition-transform duration-200">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                    {uploadFile ? (
                                        <span className="text-blue-600 dark:text-blue-400 font-bold">{uploadFile.name}</span>
                                    ) : t('admin.finances.upload_hint', 'Fes clic o arrossega un arxiu')}
                                </p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">PDF, PNG, JPG (MÀX. 5MB)</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                        >
                            {t('common.cancel', 'Cancel·lar')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`flex-1 py-3 font-bold text-white rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 ${transaction.type === 'income'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                                }`}
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    {t('common.save', 'Guardar')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
