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
            color: 'blue',
            bgColor: 'bg-blue-100 dark:bg-blue-900/20',
            textColor: 'text-blue-600 dark:text-blue-400',
        },
        {
            label: t('admin.finances.income', 'Ingressos'),
            value: stats.income,
            icon: TrendingUp,
            color: 'emerald',
            bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
            textColor: 'text-emerald-600 dark:text-emerald-400',
        },
        {
            label: t('admin.finances.expenses', 'Despeses'),
            value: stats.expenses,
            icon: TrendingDown,
            color: 'rose',
            bgColor: 'bg-rose-100 dark:bg-rose-900/20',
            textColor: 'text-rose-600 dark:text-rose-400',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 transition-all hover:shadow-md"
                >
                    <div className={`p-3 rounded-xl ${card.bgColor} ${card.textColor}`}>
                        <card.icon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                            {card.value.toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' })}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
