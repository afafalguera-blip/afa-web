import { Calendar, Clock, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NewsDetailHeaderProps {
    title: string;
    excerpt?: string;
    createdAt: string;
    language: string;
}

export function NewsDetailHeader({ title, excerpt, createdAt, language }: NewsDetailHeaderProps) {
    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-8 mb-12 overflow-hidden">
            <Link
                to="/noticies"
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-colors mb-10 group"
            >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Notícies
            </Link>

            <div className="space-y-8">
                <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    <span className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-white/5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {new Date(createdAt).toLocaleDateString(language, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })}
                    </span>
                    <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        3 min de lectura
                    </span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight break-words">
                    {title}
                </h1>

                {excerpt && (
                    <p className="text-lg sm:text-xl lg:text-2xl font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl border-l-2 border-slate-100 dark:border-white/10 pl-4 sm:pl-6 break-words">
                        {excerpt}
                    </p>
                )}

                <div className="flex items-center gap-4 pt-6">
                    <div className="flex -space-x-3 shrink-0">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-4 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm">
                                AFA
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">Junta del AFA</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Escola Falguera</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
