import { MapPin } from 'lucide-react';

interface NewsEventCardProps {
    eventDate: string | null;
    language: string;
}

export function NewsEventCard({ eventDate, language }: NewsEventCardProps) {
    if (!eventDate) return null;

    const dateObj = new Date(eventDate);

    return (
        <div className="mb-12 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-10 shadow-sm">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center text-white shrink-0 shadow-xl shadow-primary/20">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                    {dateObj.toLocaleDateString(language, { month: 'short' })}
                </span>
                <span className="text-3xl sm:text-4xl font-black leading-none">
                    {dateObj.getDate()}
                </span>
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1 sm:space-y-2 min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-primary">
                    <MapPin className="w-3.5 h-3.5" />
                    <h4 className="font-black text-[10px] uppercase tracking-[0.2em]">
                        Esdeveniment
                    </h4>
                </div>
                <p className="text-xl sm:text-3xl font-black text-slate-800 dark:text-white leading-tight break-words">
                    {dateObj.toLocaleDateString(language, { weekday: 'long' })}, {dateObj.getHours()}:{dateObj.getMinutes().toString().padStart(2, '0')}h
                </p>
            </div>
        </div>
    );
}
