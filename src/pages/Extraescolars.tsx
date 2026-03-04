import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo } from 'react';
import { ActivityDetailModal } from '../components/public/ActivityDetailModal';
import { ActivitiesCalendar } from '../components/public/ActivitiesCalendar';
import { useContentTranslation } from '../hooks/useContentTranslation';
import { ActivityService, type Activity } from '../services/ActivityService';
import { useAuth } from '../hooks/useAuth';
import { SEO } from '../components/common/SEO';
import { ExtraescolarsHeader } from '../components/public/extraescolars/ExtraescolarsHeader';
import { ExtraescolarsFilters } from '../components/public/extraescolars/ExtraescolarsFilters';
import { ActivityCard } from '../components/public/extraescolars/ActivityCard';
import { EnrollmentBanner } from '../components/public/extraescolars/EnrollmentBanner';

export function Extraescolars() {
  const { i18n } = useTranslation();
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
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() =>
    ['all', ...Array.from(new Set(activities.map(a => a.category)))],
    [activities]
  );

  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const title = tContent(activity, 'title');
      const description = tContent(activity, 'description');

      const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || activity.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activities, searchQuery, selectedCategory, tContent]);

  const handleActivityClick = (activity: any) => {
    setSelectedActivity({
      ...activity,
      image: activity.image_url
    });
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-4 lg:px-6">
      <SEO
        title="Actividades Extraescolares"
        description="Explora las actividades extraescolares disponibles en el AFA Escuela Falguera: deportes, música, idiomas y más. Consulta horarios y precios para el curso actual."
      />

      <ExtraescolarsHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {viewMode === 'list' && (
        <>
          <ExtraescolarsFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={categories}
          />

          <EnrollmentBanner
            onSignup={() => navigate('/extraescolars/inscripcio')}
          />
        </>
      )}

      <div className="transition-all duration-300">
        {viewMode === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                isAdmin={isAdmin}
                onEdit={() => navigate('/admin/activities')}
                onClick={() => handleActivityClick(activity)}
              />
            ))}
          </div>
        ) : (
          <ActivitiesCalendar
            activities={activities}
            onActivityClick={handleActivityClick}
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
