import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Trash2, Mail, User, Loader2, Phone } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../../../hooks/useAuth';
import { ConfigService, type ShopConfig } from '../../../services/ConfigService';
import { ShopService } from '../services/ShopService';
import { proxyStorageUrl } from '../../../utils/storageUrl';

interface CheckoutModalProps {
    onClose: () => void;
}

export function CheckoutModal({ onClose }: CheckoutModalProps) {
    const { i18n, t } = useTranslation();
    const { items, total, removeItem, clearCart, isMember } = useCart();
    const { user, profile } = useAuth();

    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [isMemberLocal, setIsMemberLocal] = useState(isMember);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [shopConfig, setShopConfig] = useState<ShopConfig | null>(null);

    const currentLang = (i18n.language || 'ca') as 'ca' | 'es' | 'en';

    useEffect(() => {
        if (profile?.full_name) setCustomerName(profile.full_name);
        if (user?.email) setCustomerEmail(user.email);
        if (user?.phone) setCustomerPhone(user.phone);

        const fetchConfig = async () => {
            const config = await ConfigService.getShopConfig();
            if (config) setShopConfig(config);
        };
        fetchConfig();
    }, [profile, user]);

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) return;

        const hasEmail = customerEmail.trim().length > 0;
        const hasPhone = customerPhone.trim().length > 0;

        if (!customerName.trim() || (!hasEmail && !hasPhone)) {
            setErrorMsg(t('shop_page.contact_required'));
            return;
        }

        setLoading(true);
        setErrorMsg('');

        try {
            await ShopService.createComplexOrder({
                customerName: customerName.trim(),
                customerEmail: customerEmail.trim(),
                customerPhone: customerPhone.trim(),
                totalAmount: total,
                items: items.map(item => ({
                    variant_id: item.variant.id,
                    quantity: item.quantity,
                    price_at_time: isMemberLocal ? item.variant.price_member : item.variant.price_non_member
                })),
                userId: user?.id,
                language: currentLang,
                isMember: isMemberLocal
            });

            setSuccess(true);
            clearCart();
        } catch (error: unknown) {
            console.error('Checkout error:', error);
            setErrorMsg('Error al processar la comanda. Torna-ho a provar.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                <div className="bg-white dark:bg-card-dark rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">{t('shop_page.success_title')}</h3>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        {shopConfig?.translations?.[currentLang] || t('shop_page.success_message')}
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl"
                    >
                        {t('common.close')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-card-dark w-full h-full sm:h-auto max-w-2xl sm:max-h-[90vh] flex flex-col sm:rounded-3xl shadow-2xl relative overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {t('shop_page.cart_title')} ({items.length})
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {items.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-400">{t('shop_page.empty_cart')}</p>
                            <button onClick={onClose} className="mt-4 text-primary font-bold">{t('shop_page.back_to_shop')}</button>
                        </div>
                    ) : (
                        <>
                            {/* Items List */}
                            <div className="space-y-3">
                                {items.map(item => (
                                    <div key={item.id} className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl group text-sm">
                                        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden flex-shrink-0">
                                            {item.product.image_url && (
                                                <img src={proxyStorageUrl(item.product.image_url)} alt={item.product.name} className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-900 dark:text-white truncate uppercase tracking-tight">{item.product.name}</h4>
                                            <p className="text-slate-500 text-xs mt-0.5">Talla: {item.variant.size} • Qt: {item.quantity}</p>
                                            <p className="text-primary font-black mt-1 text-[15px]">{(Number(isMemberLocal ? item.variant.price_member : item.variant.price_non_member) * item.quantity).toFixed(2)}€</p>
                                        </div>
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors self-center"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Summary */}
                            <div className="p-5 bg-primary/5 rounded-2xl space-y-2 border border-primary/10">
                                <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-widest">
                                    <span>{t('shop_page.subtotal')}</span>
                                    <span>{total.toFixed(2)}€</span>
                                </div>
                                <div className="flex justify-between items-center text-xl font-black text-slate-900 dark:text-white border-t border-primary/10 pt-3 mt-1">
                                    <span>{t('shop_page.total')}</span>
                                    <span className="text-primary">{total.toFixed(2)}€</span>
                                </div>
                                <p className="text-[10px] text-slate-400 text-center mt-3 uppercase tracking-widest font-bold italic">{t('shop_page.payment_note')}</p>
                            </div>

                            {/* Checkout Form */}
                            <form onSubmit={handleCheckout} className="space-y-4">
                                <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-widest flex items-center gap-2">
                                    <div className="h-4 w-1 bg-primary rounded-full"></div>
                                    {t('shop_page.contact_details')}
                                </h3>
                                <div className="grid sm:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                            <User className="w-3 h-3" /> {t('shop_page.customer_name_label')}
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            placeholder="Joan Garcia"
                                            className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-medium"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                            <Mail className="w-3 h-3" /> {t('shop_page.customer_email_label')}
                                        </label>
                                        <input
                                            type="email"
                                            value={customerEmail}
                                            onChange={e => setCustomerEmail(e.target.value)}
                                            placeholder={t('shop_page.customer_email_placeholder')}
                                            className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-medium"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                            <Phone className="w-3 h-3" /> {t('shop_page.customer_phone_label')}
                                        </label>
                                        <input
                                            type="tel"
                                            value={customerPhone}
                                            onChange={e => setCustomerPhone(e.target.value)}
                                            placeholder={t('shop_page.customer_phone_placeholder')}
                                            className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Member toggle */}
                                <label className="flex items-center gap-3 cursor-pointer select-none p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-primary/40 transition-all">
                                    <div className="relative flex-shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={isMemberLocal}
                                            onChange={e => setIsMemberLocal(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer-checked:bg-primary transition-colors"></div>
                                        <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">Soc soci/a de l'AFA</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Aplica el preu de soci</p>
                                    </div>
                                </label>

                                {errorMsg && (
                                    <p className="text-red-500 text-xs font-bold bg-red-50 dark:bg-red-500/10 p-4 rounded-xl border border-red-100 dark:border-red-500/20">{errorMsg}</p>
                                )}

                                <button
                                    disabled={loading || items.length === 0}
                                    className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl shadow-xl hover:shadow-2xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Processant...
                                        </>
                                    ) : (
                                        t('shop_page.checkout_btn')
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
