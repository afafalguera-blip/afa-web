import { UserPlus, UserMinus, Users, Star } from 'lucide-react';

export function StatsCards({ inscriptions }: any) {
  // Logic from admin.html to calculate stats
  let totalActive = 0;
  let totalBaja = 0;
  let afaMembers = 0;

  inscriptions.forEach((ins: any) => {
    let count = 1;
    if (ins.students && Array.isArray(ins.students)) {
      count = ins.students.length;
    }
    
    if (ins.status === 'baja') {
      totalBaja += count;
    } else {
      totalActive += count;
      if (ins.afa_member) afaMembers += count;
    }
  });

  const cards = [
    { title: 'Inscritos (altas)', value: totalActive, icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Bajas', value: totalBaja, icon: UserMinus, color: 'text-amber-600', bg: 'bg-amber-100' },
    { title: 'Socis AFA', value: `${afaMembers}/${totalActive > afaMembers ? totalActive - afaMembers : 0}`, icon: Users, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Popular', value: '...', icon: Star, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {cards.map((card, i) => (
        <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${card.bg}`}>
            <card.icon className={`w-6 h-6 ${card.color}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{card.title}</p>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
