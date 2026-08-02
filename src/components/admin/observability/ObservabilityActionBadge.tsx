interface ObservabilityActionBadgeProps {
    action: string;
}

const ACTION_CLASS: Record<string, string> = {
    INSERT: 'bg-green-50 text-green-700 border-green-200',
    UPDATE: 'bg-amber-50 text-amber-700 border-amber-200',
    DELETE: 'bg-red-50 text-red-700 border-red-200'
};

const FALLBACK_CLASS = 'bg-neutral-100 text-neutral-700 border-neutral-200';

export function ObservabilityActionBadge({ action }: ObservabilityActionBadgeProps) {
    const normalized = action.toUpperCase();

    return (
        <span
            className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded border ${
                ACTION_CLASS[normalized] ?? FALLBACK_CLASS
            }`}
        >
            {normalized}
        </span>
    );
}
