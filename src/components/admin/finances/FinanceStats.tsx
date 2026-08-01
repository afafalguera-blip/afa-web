import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface FinanceStatsProps {
    stats: {
        balance: number;
        income: number;
        expenses: number;
    };
}

export function FinanceStats({ stats }: FinanceStatsProps) {
    const { t } = useTranslation();

    const cards = [
        {
            label: t('admin.finances.total_balance', 'Balanç Total'),
            value: stats.balance,
            icon: Wallet,
            bgColor: 'bg-neutral-100',
            textColor: 'text-neutral-700',
        },
        {
            label: t('admin.finances.income', 'Ingressos'),
            value: stats.income,
            icon: TrendingUp,
            bgColor: 'bg-emerald-50',
            textColor: 'text-emerald-700',
        },
        {
            label: t('admin.finances.expenses', 'Despeses'),
            value: stats.expenses,
            icon: TrendingDown,
            bgColor: 'bg-rose-50',
            textColor: 'text-rose-700',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className="bg-white p-6 rounded-lg border border-neutral-200 flex items-center gap-4"
                >
                    <div className={`p-3 rounded-lg ${card.bgColor} ${card.textColor}`}>
                        <card.icon className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-neutral-500">{card.label}</p>
                        <p className="text-2xl font-black text-neutral-900">
                            {card.value.toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' })}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
