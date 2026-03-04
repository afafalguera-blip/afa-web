interface ObservabilityActionBadgeProps {
    action: string;
}

export function ObservabilityActionBadge({ action }: ObservabilityActionBadgeProps) {
    const getActionColor = (action: string) => {
        switch (action.toUpperCase()) {
            case 'INSERT': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
            case 'UPDATE': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
            case 'DELETE': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
        }
    };

    return (
        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border tracking-wider ${getActionColor(action)}`}>
            {action.toUpperCase()}
        </span>
    );
}
