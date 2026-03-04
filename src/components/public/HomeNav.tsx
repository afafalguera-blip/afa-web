import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface HomeNavProps {
    onOpenAcollida: () => void;
}

export const HomeNav: React.FC<HomeNavProps> = ({ onOpenAcollida }) => {
    const { t } = useTranslation();

    return (
        <section className="px-6 py-4 relative z-20 mb-6">
            {/* Mobile Grid */}
            <div className="grid grid-cols-5 gap-2 lg:hidden">
                <Link to="/extraescolars" className="flex flex-col items-center gap-1.5 group">
                    <div className="w-12 h-12 flex items-center justify-center bg-primary rounded-2xl text-white shadow-lg shadow-primary/20 group-active:scale-95 transition-transform">
                        <span className="material-icons-round text-xl">sports_soccer</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-900 dark:text-slate-200 uppercase tracking-tight text-center">{t('home.extraescolars')}</span>
                </Link>
                <Link to="/quotes" className="flex flex-col items-center gap-1.5 group">
                    <div className="w-12 h-12 flex items-center justify-center bg-secondary rounded-2xl text-white shadow-lg shadow-secondary/20 group-active:scale-95 transition-transform">
                        <span className="material-icons-round text-xl">payments</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-900 dark:text-slate-200 uppercase tracking-tight text-center">{t('home.fees')}</span>
                </Link>
                <Link to="/calendari" className="flex flex-col items-center gap-1.5 group">
                    <div className="w-12 h-12 flex items-center justify-center bg-amber-500 rounded-2xl text-white shadow-lg shadow-amber-500/20 group-active:scale-95 transition-transform">
                        <span className="material-icons-round text-xl">calendar_today</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-900 dark:text-slate-200 uppercase tracking-tight text-center">{t('home.calendar')}</span>
                </Link>
                <button
                    onClick={onOpenAcollida}
                    className="flex flex-col items-center gap-1.5 group"
                >
                    <div className="w-12 h-12 flex items-center justify-center bg-indigo-500 rounded-2xl text-white shadow-lg shadow-indigo-500/20 group-active:scale-95 transition-transform">
                        <span className="material-icons-round text-xl">home_work</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-900 dark:text-slate-200 uppercase tracking-tight text-center">{t('home.acollida')}</span>
                </button>
                <Link to="/contacte" className="flex flex-col items-center gap-1.5 group">
                    <div className="w-12 h-12 flex items-center justify-center bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-500/20 group-active:scale-95 transition-transform">
                        <span className="material-icons-round text-xl">mail</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-900 dark:text-slate-200 uppercase tracking-tight text-center">{t('home.contact')}</span>
                </Link>
            </div>

            {/* Desktop Floating Pill Nav */}
            <div className="hidden lg:flex justify-center">
                <div className="bg-white dark:bg-slate-800 rounded-full shadow-xl shadow-slate-200/50 dark:shadow-black/50 p-2 flex items-center gap-2 border border-slate-100 dark:border-slate-700">
                    <Link to="/extraescolars" className="flex items-center gap-3 px-6 py-3 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                            <span className="material-icons-round">sports_soccer</span>
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{t('home.extraescolars')}</span>
                    </Link>

                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>

                    <Link to="/quotes" className="flex items-center gap-3 px-6 py-3 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                        <div className="w-10 h-10 bg-secondary/10 text-secondary rounded-full flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-colors">
                            <span className="material-icons-round">payments</span>
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{t('home.fees')}</span>
                    </Link>

                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>

                    <Link to="/calendari" className="flex items-center gap-3 px-6 py-3 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                        <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                            <span className="material-icons-round">calendar_today</span>
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{t('home.calendar')}</span>
                    </Link>

                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>

                    <button
                        onClick={onOpenAcollida}
                        className="flex items-center gap-3 px-6 py-3 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
                    >
                        <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                            <span className="material-icons-round">home_work</span>
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{t('home.acollida')}</span>
                    </button>

                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>

                    <Link to="/contacte" className="flex items-center gap-3 px-6 py-3 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                        <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                            <span className="material-icons-round">mail</span>
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{t('home.contact')}</span>
                    </Link>
                </div>
            </div>
        </section>
    );
};
