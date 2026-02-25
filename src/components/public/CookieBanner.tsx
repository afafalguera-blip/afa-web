import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';
import { CookieService } from '../../services/CookieService';

export function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!CookieService.hasConsent()) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAcceptAll = () => {
        CookieService.acceptAll();
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-24 lg:bottom-6 left-6 right-6 lg:left-auto lg:right-6 lg:max-w-md z-[100] animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl shadow-blue-500/10 border border-slate-100 dark:border-slate-700 p-6 relative overflow-hidden">
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>

                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shrink-0">
                        <Cookie size={24} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                            Fem servir cookies
                            <button
                                onClick={() => setIsVisible(false)}
                                className="lg:hidden text-slate-400 hover:text-slate-600"
                            >
                                <X size={18} />
                            </button>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Utilitzem cookies per millorar la teva experiència. Pots configurar les teves preferències o acceptar-les totes. Consulta la nostra{' '}
                            <Link to="/privacitat" className="text-primary hover:underline font-bold">Política de privacitat</Link> i{' '}
                            <Link to="/cookies" className="text-primary hover:underline font-bold">Cookies</Link>.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleAcceptAll}
                                className="flex-1 bg-primary text-white text-xs font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
                            >
                                Acceptar totes
                            </button>
                            <Link
                                to="/cookies"
                                className="flex-1 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-200 text-xs font-bold py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-all text-center"
                                onClick={() => setIsVisible(false)}
                            >
                                Configurar
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
