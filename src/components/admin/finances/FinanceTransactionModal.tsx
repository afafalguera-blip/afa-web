import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Upload, Save, Calendar, Tag, CreditCard, Type } from 'lucide-react';
import type { FinanceTransaction } from '../../../services/FinanceService';
import { getRegionalLanguageTag } from '../../../utils/locale';
import { Modal } from '../../common/Modal';
import { useDirtyGuard } from '../../../hooks/useDirtyGuard';

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

const FIELD_CLASS =
    'w-full bg-white border border-neutral-200 rounded-lg px-4 py-2.5 text-sm text-neutral-900 focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 outline-none transition-colors';
const LABEL_CLASS = 'text-xs font-bold text-neutral-500 uppercase ml-1 flex items-center gap-1.5';

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
    const { t, i18n } = useTranslation();
    const nativeDateLocale = getRegionalLanguageTag(i18n.resolvedLanguage || i18n.language);

    // The parent owns the draft; treat any filled-in field as unsaved work.
    const isDirty = useMemo(
        () => !isSubmitting && Boolean(
            transaction.description || transaction.category || Number(transaction.amount) > 0 || uploadFile
        ),
        [transaction.description, transaction.category, transaction.amount, uploadFile, isSubmitting]
    );
    const { confirmDiscard } = useDirtyGuard(isOpen && isDirty);

    const requestClose = useCallback(async () => {
        if (await confirmDiscard()) onClose();
    }, [confirmDiscard, onClose]);

    return (
        <Modal
            open={isOpen}
            onClose={requestClose}
            title={t('admin.finances.new_transaction_title', 'Nova Transacció')}
            size="md"
            closeOnBackdrop={false}
            footer={
                <>
                    <button
                        type="button"
                        onClick={requestClose}
                        disabled={isSubmitting}
                        className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-50"
                    >
                        {t('common.cancel', 'Cancel·lar')}
                    </button>
                    <button
                        type="submit"
                        form="finance-transaction-form"
                        disabled={isSubmitting}
                        className="px-3.5 py-2 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-[13px] font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {t('common.save', 'Guardar')}
                    </button>
                </>
            }
        >
            <form id="finance-transaction-form" onSubmit={onSubmit} className="space-y-5">
                <p className="text-xs text-neutral-500 -mt-1">Registra un nou moviment econòmic</p>

                {/* Type & Date Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <span className={LABEL_CLASS}>
                            <CreditCard className="w-3 h-3" aria-hidden="true" /> {t('admin.finances.type', 'Tipus')}
                        </span>
                        <div className="flex bg-neutral-100 p-1 rounded-lg">
                            {(['income', 'expense'] as const).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setTransaction({ ...transaction, type })}
                                    aria-pressed={transaction.type === type}
                                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-colors ${transaction.type === type
                                        ? type === 'income'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-rose-600 text-white'
                                        : 'text-neutral-500 hover:text-neutral-700'
                                        }`}
                                >
                                    {t(`admin.finances.${type}`, type.toUpperCase())}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className={LABEL_CLASS} htmlFor="finance-date">
                            <Calendar className="w-3 h-3" aria-hidden="true" /> {t('admin.finances.date', 'Data')}
                        </label>
                        <input
                            id="finance-date"
                            type="date"
                            lang={nativeDateLocale}
                            required
                            className={FIELD_CLASS}
                            value={transaction.date}
                            onChange={e => setTransaction({ ...transaction, date: e.target.value })}
                        />
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                    <label className={LABEL_CLASS} htmlFor="finance-description">
                        <Type className="w-3 h-3" aria-hidden="true" /> {t('admin.finances.description_label', 'Descripció')}
                    </label>
                    <input
                        id="finance-description"
                        type="text"
                        required
                        placeholder="Ex: Pagament botiga, Subvenció AFA..."
                        className={FIELD_CLASS}
                        value={transaction.description}
                        onChange={e => setTransaction({ ...transaction, description: e.target.value })}
                    />
                </div>

                {/* Amount & Category Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={LABEL_CLASS} htmlFor="finance-amount">
                            {transaction.type === 'income' ? '+' : '-'} {t('admin.finances.amount', 'Import (€)')}
                        </label>
                        <input
                            id="finance-amount"
                            type="number"
                            step="0.01"
                            required
                            className={`${FIELD_CLASS} font-bold`}
                            value={transaction.amount}
                            onChange={e => setTransaction({ ...transaction, amount: Number(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className={LABEL_CLASS} htmlFor="finance-category">
                            <Tag className="w-3 h-3" aria-hidden="true" /> {t('admin.finances.category', 'Categoria')}
                        </label>
                        <input
                            id="finance-category"
                            type="text"
                            list="categories"
                            required
                            className={FIELD_CLASS}
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
                    <label className={LABEL_CLASS} htmlFor="finance-attachment">
                        <Upload className="w-3 h-3" aria-hidden="true" /> {t('admin.finances.attachment', 'Adjuntar Factura/Rebut (PDF/Img)')}
                    </label>
                    <div className="border-2 border-dashed border-neutral-200 rounded-lg p-6 text-center hover:bg-neutral-50 transition-colors relative">
                        <input
                            id="finance-attachment"
                            type="file"
                            accept="image/*,.pdf"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={e => setUploadFile(e.target.files?.[0] || null)}
                        />
                        <div className="flex flex-col items-center gap-2">
                            <div className="p-3 bg-neutral-100 text-neutral-600 rounded-full">
                                <Upload className="w-6 h-6" aria-hidden="true" />
                            </div>
                            <p className="text-sm font-medium text-neutral-600">
                                {uploadFile ? (
                                    <span className="text-neutral-900 font-bold">{uploadFile.name}</span>
                                ) : t('admin.finances.upload_hint', 'Fes clic o arrossega un arxiu')}
                            </p>
                            <p className="text-[10px] text-neutral-400 uppercase tracking-widest">PDF, PNG, JPG (MÀX. 5MB)</p>
                        </div>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
