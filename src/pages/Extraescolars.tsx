import { useNavigate } from 'react-router-dom';
import { Search, Calendar, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { ActivityDetailModal } from '../components/public/ActivityDetailModal';
import { ActivityService } from '../services/ActivityService';
import type { Activity } from '../services/ActivityService';

const FILTERS = ["Totes", "Educatiu", "Artística", "Idiomes", "Música", "Esports"];

export function Extraescolars() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("Totes");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchActivities = async () => {
    try {
      const data = await ActivityService.getAll();
      setActivities(data);
      setFilteredActivities(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load activities. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
    let result = activities;
    
    // Filter by Category
    if (activeFilter !== "Totes") {
        result = result.filter(a => a.category === activeFilter);
    }

    // Filter by Search
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(a => 
            a.title.toLowerCase().includes(q) || 
            a.description.toLowerCase().includes(q)
        );
    }

    setFilteredActivities(result);
  }, [activeFilter, searchQuery, activities]);

  const handleOpenDetail = (activity: any) => {
    // Map backend model to frontend model for Modal if needed
    // Actually the modal props align mostly, we just need to ensure consistency
    const modalProps = {
        ...activity,
        // Ensure legacy fields mapping if necessary
        schedule: activity.schedule_details,
        spotsLeft: activity.spots,
        importantNote: activity.important_note,
        categoryIcon: activity.category_icon || 'school',
        isStemApproved: activity.is_stem_approved,
        priceInfo: activity.price_info || '/mes'
    };
    setSelectedActivity(modalProps);
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-card-dark border-none rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-white/10 focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-400 dark:text-white"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {FILTERS.map((filter) => (
            <button 
              key={filter} 
              onClick={() => setActiveFilter(filter)}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === filter 
                ? 'bg-primary text-white' 
                : 'bg-white dark:bg-card-dark text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="h-64 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : error ? (
         <div className="px-6 pb-24 text-center">
             <div className="inline-flex items-center justify-center p-3 bg-red-100 rounded-full mb-4">
                 <AlertCircle className="w-6 h-6 text-red-600" />
             </div>
             <p className="text-slate-600 mb-4">{error}</p>
             <p className="text-xs text-slate-400">If you are an admin, please verify the database migration has been run.</p>
         </div>
      ) : (
          <div className="px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
            {filteredActivities.map(activity => (
              <div 
                key={activity.id} 
                onClick={() => handleOpenDetail(activity)}
                className="bg-card-light dark:bg-card-dark rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-white/5 group transition-transform active:scale-[0.98] hover:shadow-md hover:scale-[1.01] transition-all flex flex-col cursor-pointer"
              >
                <div className="relative h-44 overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                  <img src={activity.image_url} alt={activity.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className={`absolute top-4 right-4 ${activity.color || 'bg-blue-500'}/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider z-20`}>
                    {activity.category}
                  </span>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">{activity.title}</h3>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-lg font-bold text-primary">{activity.price}€<span className="text-xs font-normal text-slate-500">{activity.price_info}</span></p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-6 flex-1">
                    <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm">
                      <Calendar className="text-primary w-4 h-4 mr-2 shrink-0" />
                      <span className="truncate">{activity.schedule_summary}</span>
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
      )}

      {selectedActivity && (
        <ActivityDetailModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            activity={selectedActivity}
            onSignUp={() => navigate('/extraescolars/inscripcio')}
        />
      )}
    </>
  );
}
