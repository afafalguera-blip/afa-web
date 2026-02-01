import { useNavigate } from 'react-router-dom';
import { Search, Calendar as CalendarIcon, User, Loader2, LayoutGrid, Rocket, Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { ActivityDetailModal } from '../components/public/ActivityDetailModal';
import { ActivitiesCalendar } from '../components/public/ActivitiesCalendar';
import { useContentTranslation } from '../hooks/useContentTranslation';
import { ActivityService } from '../services/ActivityService';
import type { Activity } from '../services/ActivityService';
import { useAuth } from '../contexts/AuthContext';

export function Extraescolars() {
  const { t } = useTranslation();
  const { tContent } = useContentTranslation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const data = await ActivityService.getAll();
      setActivities(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(activities.map(a => a.category)))];

  const filteredActivities = activities.filter(activity => {
    const title = tContent(activity, 'title');
    const description = tContent(activity, 'description');
    
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || activity.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-4 lg:px-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('home.extraescolars')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
            {t('home.course_current')}
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shadow-inner inline-flex self-start">
            <button 
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm ${
                    viewMode === 'list' 
                    ? 'bg-white dark:bg-slate-700 text-primary shadow-md' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
                <LayoutGrid className="w-4 h-4" /> {t('common.list' as any)}
            </button>
            <button 
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm ${
                    viewMode === 'calendar' 
                    ? 'bg-white dark:bg-slate-700 text-primary shadow-md' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
                <CalendarIcon className="w-4 h-4" /> {t('home.calendar')}
            </button>
        </div>
      </div>

      {viewMode === 'list' && (
          <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder={t('common.search' as any)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                  {categories.map(cat => (
                      <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                              selectedCategory === cat
                              ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/50'
                          }`}
                      >
                          {cat === 'all' ? t('common.all' as any) : cat}
                      </button>
                  ))}
              </div>
          </div>
      )}

      {/* Special Offer Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group mb-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl transition-transform group-hover:scale-110 duration-1000"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl md:text-2xl font-bold mb-2">{t('inscription.pricing.offer_banner_title')}</h2>
            <p className="text-blue-50/90 text-sm md:text-base leading-relaxed">
              {t('inscription.pricing.offer_banner_body')}
            </p>
          </div>
          <button 
            onClick={() => navigate('/inscripcions')}
            className="px-6 py-3 bg-white text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-lg whitespace-nowrap"
          >
            {t('inscription.activity_modal.signup_btn')}
          </button>
        </div>
      </div>

      <div className="transition-all duration-300">
        {viewMode === 'list' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredActivities.map((activity) => (
                    <div 
                      key={activity.id} 
                      onClick={() => {
                          setSelectedActivity({
                              ...activity,
                              image: activity.image_url
                          });
                          setIsModalOpen(true);
                      }}
                      className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-white/5 group transition-all active:scale-[0.98] hover:shadow-md hover:scale-[1.01] flex flex-col cursor-pointer relative"
                    >
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/admin/activities');
                          }}
                          className="absolute top-4 right-4 z-30 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 scale-0 group-hover:scale-100 transition-transform flex items-center gap-1 text-xs px-3"
                        >
                          <Edit size={14} />
                          {t('common.edit')}
                        </button>
                      )}
                      <div className="relative h-44 overflow-hidden shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                        <img src={activity.image_url} alt={tContent(activity, 'title')} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <span className={`absolute top-4 right-4 ${activity.color || 'bg-blue-500'}/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider z-20`}>
                          {activity.category}
                        </span>
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">{tContent(activity, 'title')}</h3>
                          <div className="text-right shrink-0 ml-2">
                            <div className="flex flex-col items-end">
                              <p className="text-lg font-bold text-primary">
                                {activity.price_member || activity.price}€
                                <span className="text-[10px] font-medium text-slate-400 ml-1">({t('inscription.pricing.price_member')})</span>
                              </p>
                              {activity.price_non_member && (
                                <p className="text-sm font-bold text-slate-400 -mt-1">
                                  {activity.price_non_member}€
                                  <span className="text-[9px] font-medium text-slate-400/70 ml-1">({t('inscription.pricing.price_non_member')})</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2 mb-6 flex-1">
                          <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm">
                            <CalendarIcon className="text-primary w-4 h-4 mr-2 shrink-0" />
                            <span className="truncate">{tContent(activity, 'schedule_summary')}</span>
                          </div>
                          <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm">
                            <User className="text-primary w-4 h-4 mr-2 shrink-0" />
                            <span className="truncate">{tContent(activity, 'grades')}</span>
                          </div>
                        </div>
                        <button className="w-full py-3.5 bg-primary hover:bg-opacity-90 text-white font-semibold rounded-2xl shadow-lg shadow-primary/20 transition-all">
                          {t('home.view_details')}
                        </button>
                      </div>
                    </div>
                ))}
            </div>
        ) : (
            <ActivitiesCalendar 
                activities={activities} 
                onActivityClick={(activity) => {
                    setSelectedActivity({
                        ...activity,
                        image: activity.image_url
                    });
                    setIsModalOpen(true);
                }}
            />
        )}
      </div>

      {selectedActivity && (
        <ActivityDetailModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            activity={selectedActivity}
            onSignUp={() => navigate('/extraescolars/inscripcio')}
        />
      )}
    </div>
  );
}
