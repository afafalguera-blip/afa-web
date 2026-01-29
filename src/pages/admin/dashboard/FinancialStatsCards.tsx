import { Euro, ShoppingBag, Clock, TrendingUp } from 'lucide-react';
import type { FinancialStats, ShopStats } from '../../../services/StatsService';

interface Props {
  financial: FinancialStats;
  shop: ShopStats;
}

export function FinancialStatsCards({ financial, shop }: Props) {
  const cards = [
    { 
      title: 'Ingressos', 
      value: `${financial.paidAmount.toFixed(2)}€`, 
      icon: Euro, 
      color: 'text-green-600', 
      bg: 'bg-green-100',
      subtitle: `de ${financial.totalAmount.toFixed(2)}€ previstos`
    },
    { 
      title: 'Pendent de Cobrament', 
      value: `${financial.pendingAmount.toFixed(2)}€`, 
      icon: Clock, 
      color: 'text-amber-600', 
      bg: 'bg-amber-100',
      subtitle: 'Quotes pendents'
    },
    { 
      title: 'Botiga: Comandes', 
      value: shop.totalOrders, 
      icon: ShoppingBag, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100',
      subtitle: `${shop.pendingOrders} pendents`
    },
    { 
      title: 'Botiga: Facturació', 
      value: `${shop.revenue.toFixed(2)}€`, 
      icon: TrendingUp, 
      color: 'text-purple-600', 
      bg: 'bg-purple-100',
      subtitle: 'Total vendes'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
      {cards.map((card, i) => (
        <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${card.bg}`}>
            <card.icon className={`w-6 h-6 ${card.color}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{card.title}</p>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
