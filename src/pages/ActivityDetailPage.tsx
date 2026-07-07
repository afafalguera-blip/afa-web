import { useEffect, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { ActivityService, type Activity } from '../services/ActivityService';
import { useContentTranslation } from '../hooks/useContentTranslation';
import { SEO } from '../components/common/SEO';
import { LazyImage } from '../components/common/LazyImage';
import { activityPath, slugify } from '../utils/slug';
import { RichActivityDescription } from '../components/public/extraescolars/RichActivityDescription';

export default function ActivityDetailPage() {
  const { id, slug } = useParams<{ id: string; slug?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { tContent } = useContentTranslation();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      const numericId = Number(id);
      if (!numericId || Number.isNaN(numericId)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await ActivityService.getById(numericId);
        setActivity(data);
      } catch (err) {
        console.error('Error fetching activity:', err);
        setActivity(null);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-24 px-4 text-center">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-4xl text-slate-300">school</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          {t('inscription.activity_modal.not_found', 'Activitat no trobada')}
        </h2>
        <button
          onClick={() => navigate('/extraescolars')}
          className="mt-4 text-primary font-bold flex items-center gap-2"
        >
          <ChevronLeft size={20} /> {t('inscription.activity_modal.back', 'Tornar a Extraescolars')}
        </button>
      </div>
    );
  }

  // Canonical redirect: keep URL slug in sync with the activity title
  const expectedSlug = slugify(activity.title || '');
  if (expectedSlug && slug !== expectedSlug) {
    return <Navigate to={activityPath(activity)} replace />;
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      <SEO
        title={tContent(activity, 'title')}
        description={tContent(activity, 'description')}
        ogImage={activity.image_url || undefined}
        ogType="article"
      />

      {/* Header Image */}
      <div className="relative h-[35vh] min-h-[260px] sm:h-[45vh] sm:min-h-[360px] w-full overflow-hidden">
        <LazyImage
          src={activity.image_url}
          alt={tContent(activity, 'title')}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background-light dark:to-background-dark"></div>

        {/* Back button */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-4">
          <button
            onClick={() => navigate('/extraescolars')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-all active:scale-90"
            aria-label={t('inscription.activity_modal.back', 'Tornar')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </div>
      </div>

      {/* Content Container */}
      <div className="relative -mt-12 mx-auto max-w-3xl flex flex-col px-6">
        {/* Category & Metadata Chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex h-8 items-center justify-center gap-x-2 rounded-full bg-primary/20 dark:bg-primary/30 px-4">
            <span className="material-symbols-outlined text-primary text-[18px]">
              {activity.category_icon || 'school'}
            </span>
            <p className="text-primary text-xs font-bold uppercase tracking-wider">{tContent(activity, 'category')}</p>
          </div>
          {activity.is_stem_approved && (
            <div className="flex h-8 items-center justify-center gap-x-2 rounded-full bg-white/50 dark:bg-white/10 px-4 backdrop-blur-sm border border-black/5 dark:border-white/5">
              <span className="material-symbols-outlined text-[#667085] text-[18px]">military_tech</span>
              <p className="text-[#667085] dark:text-gray-300 text-xs font-medium">{t('inscription.activity_modal.stem_approved')}</p>
            </div>
          )}
        </div>

        {/* Title & Price */}
        <div className="flex justify-between items-start mb-6 gap-4">
          <h1 className="text-[#111813] dark:text-white text-3xl sm:text-4xl font-bold leading-[1.1] tracking-tight">
            {tContent(activity, 'title')}
          </h1>
          <div className="text-right shrink-0">
            <div className="flex flex-col items-end">
              <p className="text-primary text-2xl font-bold">
                {activity.price_member || activity.price}€
                <span className="text-xs font-medium text-[#667085] dark:text-gray-400 ml-1">({t('inscription.pricing.price_member')})</span>
              </p>
              {activity.price_non_member && (
                <p className="text-[#667085] dark:text-gray-400 text-sm font-bold -mt-1">
                  {activity.price_non_member}€
                  <span className="text-[10px] font-medium text-[#667085]/70 ml-1">({t('inscription.pricing.price_non_member')})</span>
                </p>
              )}
            </div>
            <p className="text-[#667085] dark:text-gray-400 text-[10px] mt-1">{activity.price_info || t('inscription.activity_modal.per_month')}</p>
          </div>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="flex flex-col items-center justify-center rounded-xl bg-white dark:bg-gray-800/50 p-3 shadow-sm border border-black/5 dark:border-white/5 text-center">
            <span className="material-symbols-outlined text-accent-terracotta mb-1">child_care</span>
            <span className="text-[10px] text-[#667085] uppercase font-bold tracking-tighter">{t('inscription.activity_modal.grades')}</span>
            <span className="text-sm font-semibold dark:text-gray-200">{tContent(activity, 'grades')}</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl bg-white dark:bg-gray-800/50 p-3 shadow-sm border border-black/5 dark:border-white/5 text-center">
            <span className="material-symbols-outlined text-accent-terracotta mb-1">location_on</span>
            <span className="text-[10px] text-[#667085] uppercase font-bold tracking-tighter">{t('inscription.activity_modal.location')}</span>
            <span className="text-sm font-semibold dark:text-gray-200 line-clamp-1">{tContent(activity, 'place') || 'Escola'}</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl bg-white dark:bg-gray-800/50 p-3 shadow-sm border border-black/5 dark:border-white/5 text-center">
            <span className="material-symbols-outlined text-accent-terracotta mb-1">groups</span>
            <span className="text-[10px] text-[#667085] uppercase font-bold tracking-tighter">{t('inscription.activity_modal.spots')}</span>
            <span className="text-sm font-semibold dark:text-gray-200">{activity.spots || t('inscription.activity_modal.spots_available')}</span>
          </div>
        </div>

        {/* Description */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-[#111813] dark:text-white mb-4">{t('inscription.activity_modal.about')}</h3>
          {tContent(activity, 'description') ? (
            <RichActivityDescription text={tContent(activity, 'description')} />
          ) : (
            <p className="text-[#4b5563] dark:text-gray-300 text-base leading-relaxed font-light">
              {t('inscription.activity_modal.default_description')}
            </p>
          )}
        </div>

        {/* Schedule */}
        {activity.schedule_details && activity.schedule_details.length > 0 && (
          <div className="mb-10">
            <h3 className="text-lg font-bold text-[#111813] dark:text-white mb-4">{t('inscription.activity_modal.schedule_title')}</h3>
            <div className="space-y-3">
              {activity.schedule_details.map((group, groupIdx) => (
                <div key={groupIdx} className="space-y-2">
                  {group.sessions?.map((session, sessionIdx) => (
                    <div
                      key={`${groupIdx}-${sessionIdx}`}
                      className="relative flex items-center justify-between p-4 rounded-xl border-2 border-transparent bg-white dark:bg-gray-800/50 shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2f4f7] dark:bg-gray-700 text-[#667085]">
                          <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                        </div>
                        <div>
                          <p className="font-bold text-sm dark:text-white">
                            {group.group}: {
                              session.day === 1 ? t('admin.editor.days.mon') :
                                session.day === 2 ? t('admin.editor.days.tue') :
                                  session.day === 3 ? t('admin.editor.days.wed') :
                                    session.day === 4 ? t('admin.editor.days.thu') :
                                      session.day === 5 ? t('admin.editor.days.fri') :
                                        t('admin.editor.days.sat')
                            }
                          </p>
                          <p className="text-xs text-[#667085] dark:text-gray-400">{session.startTime} - {session.endTime}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Important Notice */}
        {activity.important_note && (
          <div className="flex gap-3 p-4 rounded-xl bg-accent-terracotta/10 border border-accent-terracotta/20 mb-8">
            <span className="material-symbols-outlined text-accent-terracotta">info</span>
            <p className="text-xs text-[#8c5e4d] dark:text-accent-terracotta leading-snug">
              <span className="font-bold">{t('inscription.activity_modal.note_label')}</span> {tContent(activity, 'important_note')}
            </p>
          </div>
        )}
      </div>

      {/* Sticky Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-6 pb-10 bg-white/80 dark:bg-[#1e3e29]/90 backdrop-blur-xl border-t border-black/5 dark:border-white/5 z-30">
        <div className="flex gap-4 items-center max-w-3xl mx-auto">
          <button
            onClick={() => navigate(`/extraescolars/inscripcio?activity=${activity.id}`)}
            className="flex h-14 w-full items-center justify-center rounded-xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/30 active:scale-95 transition-transform"
          >
            {t('inscription.activity_modal.signup_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}
