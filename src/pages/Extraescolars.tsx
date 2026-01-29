import { useNavigate } from 'react-router-dom';
import { Search, Calendar, User, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ActivityDetailModal } from '../components/public/ActivityDetailModal';

const ACTIVITIES = [
  {
    id: 0,
    category: "Educatiu",
    title: "Workshop de Robòtica: Build & Code",
    price: 45,
    priceInfo: "/mes",
    time: "Dilluns i Dimecres, 17:00h - 18:30h",
    grades: "3r - 6è",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBty-h_7V34ad49vb7FikyDIYSI4rGKe2zAzOheIcYzxTH4cwe4q2o8wsEI6tp3xHK51pd15dbZUq2ZCroTnn-U910ntw7njr91F2CmdrzE6Dfm-nq3w2TCmqWMMH4OC9O2u6WZYGsCjdcSphdAGzqWm8HgVCeYvTcsV_xiLj-IAQ-6gnCt8z5tXUg9Y1e32WrzgDFsPjtI5Uv8VDP7-euChlnblBVOBLDgMoVAx3QocFKXXGVptJVB9G_xF9pacvPzrwltTz6vPp8",
    color: "bg-primary",
    description: "Uneix-te al nostre taller pràctic de robòtica on els alumnes aprenen els fonaments de l'enginyeria i la programació. Els participants treballaran en equips per dissenyar, construir i codificar els seus propis robots utilitzant kits de LEGO Education.",
    place: "Laboratori de l'Escola",
    spotsLeft: 12,
    schedule: [
      { group: "Grup A", days: "Dll i Dmc", time: "17:00 — 18:30" },
      { group: "Grup B", days: "Dtm i Djs", time: "17:00 — 18:30" }
    ],
    importantNote: "Tots els alumnes han de portar la seva pròpia tauleta si volen guardar els seus projectes localment.",
    categoryIcon: "school",
    isStemApproved: true
  },
  {
    id: 1,
    category: "Artística",
    title: "Teatre Musical en Anglès",
    price: 30,
    priceInfo: "/mes",
    time: "Dimarts, 16:30h - 18:00h",
    grades: "Infantil",
    image: "https://images.unsplash.com/photo-1503095392237-fc558db96328?auto=format&fit=crop&q=80&w=1000",
    color: "bg-pink-500",
    description: "Una combinació única d'expressió corporal, cant i aprenentatge de l'anglès a través de les arts escèniques. Els nens i nenes desenvolupen la seva confiança mentre es diverteixen interpretant els seus musicals preferits.",
    place: "Gimnàs de l'Escola",
    spotsLeft: 5,
    schedule: [
      { group: "Infantil 3-5", days: "Dimarts", time: "16:30 — 18:00" }
    ],
    importantNote: "Es recomana portar roba còmoda i mitjons antilliscants.",
    categoryIcon: "theater_comedy"
  },
  {
    id: 2,
    category: "Idiomes",
    title: "Marxa-Marxa en Anglès",
    price: 30,
    priceInfo: "/mes",
    time: "Dijous, 16:30h - 18:00h",
    grades: "Infantil",
    image: "https://images.unsplash.com/photo-1577896334614-201901ddde56?auto=format&fit=crop&q=80&w=1000",
    color: "bg-purple-500",
    description: "Aprenentatge actiu de l'anglès mitjançant jocs, música i moviment. Una forma natural i divertida d'introduir la llengua anglesa als més petits.",
    place: "Aula 1",
    spotsLeft: 8,
    schedule: [
      { group: "Infantil", days: "Dijous", time: "16:30 — 18:00" }
    ],
    categoryIcon: "translate"
  },
  {
    id: 3,
    category: "Música",
    title: "Timbals",
    price: 30,
    priceInfo: "/mes",
    time: "Divendres, 17:30h - 19:00h",
    grades: "Infantil i Primària",
    image: "https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?auto=format&fit=crop&q=80&w=1000",
    color: "bg-red-500",
    description: "Ritme, coordinació i cultura popular. Ensenyem als nens a tocar el timbal i a participar en les festes del barri i l'escola.",
    place: "Pati interior",
    spotsLeft: 12,
    schedule: [
      { group: "Grup Únic", days: "Divendres", time: "17:30 — 19:00" }
    ],
    categoryIcon: "library_music"
  },
  {
    id: 4,
    category: "Esports",
    title: "Futbol",
    price: 30,
    priceInfo: "/mes",
    time: "Dimarts/Dijous, 16:30h - 18:00h",
    grades: "Primària (1r - 6è)",
    image: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&q=80&w=1000",
    color: "bg-green-500",
    description: "Entrenament tècnic i valors d'equip. Els nostres monitors fomenten el respecte, la cooperació i el joc net mentre els alumnes milloren les seves habilitats futbolístiques.",
    place: "Pista Poliesportiva",
    spotsLeft: 4,
    schedule: [
      { group: "A: 1r-3r", days: "Dimarts/Dijous", time: "16:30 — 18:00" },
      { group: "B: 4t-6è", days: "Dimecres/Divendres", time: "16:30 — 18:00" }
    ],
    categoryIcon: "sports_soccer"
  },
  {
    id: 5,
    category: "Idiomes",
    title: "Anglès",
    price: 30,
    priceInfo: "/mes",
    time: "Dimarts/Dimecres, 16:30h - 18:00h",
    grades: "Primària",
    image: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=1000",
    color: "bg-blue-500",
    description: "Reforç i ampliació de la llengua anglesa seguint el currículum escolar però amb un enfocament més comunicatiu i dinàmic.",
    place: "Biblioteca",
    spotsLeft: 6,
    schedule: [
      { group: "A: 1r-3r", days: "Dimarts", time: "16:30 — 18:00" },
      { group: "B: 4t-6è", days: "Dimecres", time: "16:30 — 18:00" }
    ],
    categoryIcon: "translate"
  },
  {
    id: 6,
    category: "Esports",
    title: "Patinatge",
    price: 30,
    priceInfo: "/mes",
    time: "Dimecres, 16:30h - 18:00h",
    grades: "Primària",
    image: "https://images.unsplash.com/photo-1533602120417-09d5dd2bb545?auto=format&fit=crop&q=80&w=1000",
    color: "bg-cyan-500",
    description: "Equilibri i diversió sobre rodes. Aprenem tècniques bàsiques de lliscament, frenada i girs en un entorn segur.",
    place: "Pati de Primària",
    spotsLeft: 3,
    schedule: [
      { group: "Iniciació", days: "Dimecres", time: "16:30 — 18:00" }
    ],
    importantNote: "Obligatori portat casc, genolleres i colzeres.",
    categoryIcon: "sports_skating"
  }
];

const FILTERS = ["Totes", "Esports", "Artística", "Idiomes", "Música"];

export function Extraescolars() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenDetail = (activity: any) => {
    setSelectedActivity(activity);
    setIsModalOpen(true);
  };

  return (
    <>
      <header className="px-6 py-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{t('home.extraescolars')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Curs 2024 - 2025</p>
          </div>
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20 bg-white dark:bg-slate-800 lg:hidden">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD2zmUsA_lNi6PkTVW5FFKX6ezhKzSqf2ybugWV6W5LVoD9CP25F8bZ62uZecRlcuoYSUoMIgpBy4I6aTTrjb5zaUV5YV9xdGGa_Mqn8TXOutmWMeL5chJcGU9qUPOfYgIDDIvVlMQaEk1D8tMKQ4B_Jd-t49Daj54BlpiUKQyhDCSjNWgp3zXVEPgI115dZGpCyoD430KvcPWGb_FxE8XBf4PezoNOVLsxAnaaZag2SfgxUWZX_hRGrgYH9ASRHnh0i-dtI4dzxgM" 
              alt="Escola Logo" 
              className="w-full h-full object-cover p-1"
            />
          </div>
        </div>

        {/* Hero CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl mb-2">
            <h2 className="text-2xl font-bold mb-2">Inscripcions Obertes!</h2>
            <p className="text-blue-100 mb-4 text-sm">
                Ja pots fer la preincripció per les activitats extraescolars del curs 2024-2025.
            </p>
            <button 
                onClick={() => navigate('/extraescolars/inscripcio')}
                className="bg-white text-blue-600 px-5 py-2.5 rounded-xl font-bold text-sm shadow inline-flex items-center gap-2 hover:bg-blue-50 transition-colors"
            >
                Inscriure's Ara <ArrowRight className="w-4 h-4" />
            </button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Cerca una activitat..." 
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-card-dark border-none rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-white/10 focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-400 dark:text-white"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {FILTERS.map((filter, i) => (
            <button 
              key={filter} 
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                i === 0 
                ? 'bg-primary text-white' 
                : 'bg-white dark:bg-card-dark text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </header>

      <div className="px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
        {ACTIVITIES.map(activity => (
          <div 
            key={activity.id} 
            onClick={() => handleOpenDetail(activity)}
            className="bg-card-light dark:bg-card-dark rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-white/5 group transition-transform active:scale-[0.98] hover:shadow-md hover:scale-[1.01] transition-all flex flex-col cursor-pointer"
          >
            <div className="relative h-44 overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
              <img src={activity.image} alt={activity.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <span className={`absolute top-4 right-4 ${activity.color}/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider z-20`}>
                {activity.category}
              </span>
            </div>
            <div className="p-5 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">{activity.title}</h3>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-lg font-bold text-primary">{activity.price}€<span className="text-xs font-normal text-slate-500">/mes</span></p>
                </div>
              </div>
              <div className="space-y-2 mb-6 flex-1">
                <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm">
                  <Calendar className="text-primary w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{activity.time}</span>
                </div>
                <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm">
                  <User className="text-primary w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{activity.grades}</span>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDetail(activity);
                }}
                className="w-full py-3.5 bg-primary hover:bg-opacity-90 text-white font-semibold rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-auto"
              >
                Veure Detalls
              </button>
            </div>
          </div>
        ))}
      </div>

      <ActivityDetailModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        activity={selectedActivity || ACTIVITIES[0]}
        onSignUp={() => navigate('/extraescolars/inscripcio')}
      />
    </>
  );
}
