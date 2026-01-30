import { useTranslation } from 'react-i18next';

interface ActivityDetailModalProps {
  activity: {
    id: number;
    category: string;
    title: string;
    price: string | number;
    priceInfo?: string;
    description?: string;
    grades: string;
    place?: string;
    spotsLeft?: number;
    image: string;
    schedule?: { group: string; days: string; time: string }[];
    importantNote?: string;
    categoryIcon?: string;
    isStemApproved?: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
  onSignUp: () => void;
}

export function ActivityDetailModal({ activity, isOpen, onClose, onSignUp }: ActivityDetailModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] bg-background-light dark:bg-background-dark sm:rounded-3xl shadow-2xl overflow-y-auto hide-scrollbar animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Navigation */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-4 backdrop-blur-md bg-white/20 dark:bg-black/20">
          <button 
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-gray-800 shadow-sm transition-transform active:scale-90"
          >
            <span className="material-symbols-outlined text-primary">arrow_back_ios_new</span>
          </button>
          <div className="flex gap-2">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-gray-800 shadow-sm transition-transform active:scale-90">
              <span className="material-symbols-outlined text-primary">favorite</span>
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-gray-800 shadow-sm transition-transform active:scale-90">
              <span className="material-symbols-outlined text-primary">share</span>
            </button>
          </div>
        </div>

        {/* Header Image */}
        <div className="relative h-[40vh] min-h-[300px] w-full -mt-16">
          <div 
            className="h-full w-full bg-cover bg-center" 
            style={{ backgroundImage: `url("${activity.image}")` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-background-light dark:to-background-dark"></div>
          </div>
        </div>

        {/* Content Container */}
        <div className="relative -mt-12 flex flex-col px-6 pb-32">
          {/* Category & Metadata Chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex h-8 items-center justify-center gap-x-2 rounded-full bg-primary/20 dark:bg-primary/30 px-4">
              <span className="material-symbols-outlined text-primary text-[18px]">
                {activity.categoryIcon || 'school'}
              </span>
              <p className="text-primary text-xs font-bold uppercase tracking-wider">{activity.category}</p>
            </div>
            {activity.isStemApproved && (
              <div className="flex h-8 items-center justify-center gap-x-2 rounded-full bg-white/50 dark:bg-white/10 px-4 backdrop-blur-sm border border-black/5 dark:border-white/5">
                <span className="material-symbols-outlined text-[#667085] text-[18px]">military_tech</span>
                <p className="text-[#667085] dark:text-gray-300 text-xs font-medium">STEM Approved</p>
              </div>
            )}
          </div>

          {/* Title & Price */}
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-[#111813] dark:text-white text-3xl font-bold leading-[1.1] tracking-tight max-w-[70%]">
              {activity.title}
            </h1>
            <div className="text-right">
              <p className="text-primary text-2xl font-bold">{activity.price}€</p>
              <p className="text-[#667085] dark:text-gray-400 text-xs">{activity.priceInfo || t('inscription.activity_modal.per_month')}</p>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="flex flex-col items-center justify-center rounded-xl bg-white dark:bg-gray-800/50 p-3 shadow-sm border border-black/5 dark:border-white/5 text-center">
              <span className="material-symbols-outlined text-accent-terracotta mb-1">child_care</span>
              <span className="text-[10px] text-[#667085] uppercase font-bold tracking-tighter">{t('inscription.activity_modal.grades')}</span>
              <span className="text-sm font-semibold dark:text-gray-200">{activity.grades}</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl bg-white dark:bg-gray-800/50 p-3 shadow-sm border border-black/5 dark:border-white/5 text-center">
              <span className="material-symbols-outlined text-accent-terracotta mb-1">location_on</span>
              <span className="text-[10px] text-[#667085] uppercase font-bold tracking-tighter">{t('inscription.activity_modal.location')}</span>
              <span className="text-sm font-semibold dark:text-gray-200 line-clamp-1">{activity.place || 'Escola'}</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl bg-white dark:bg-gray-800/50 p-3 shadow-sm border border-black/5 dark:border-white/5 text-center">
              <span className="material-symbols-outlined text-accent-terracotta mb-1">groups</span>
              <span className="text-[10px] text-[#667085] uppercase font-bold tracking-tighter">{t('inscription.activity_modal.spots')}</span>
              <span className="text-sm font-semibold dark:text-gray-200">{activity.spotsLeft || t('inscription.activity_modal.spots_available')}</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-[#111813] dark:text-white mb-3">{t('inscription.activity_modal.about')}</h3>
            <p className="text-[#4b5563] dark:text-gray-300 text-base leading-relaxed font-light">
              {activity.description || t('inscription.activity_modal.default_description')}
            </p>
          </div>

          {/* Schedule Selection */}
          {activity.schedule && activity.schedule.length > 0 && (
            <div className="mb-10">
              <h3 className="text-lg font-bold text-[#111813] dark:text-white mb-4">{t('inscription.activity_modal.schedule_title')}</h3>
              <div className="space-y-3">
                {activity.schedule.map((slot, idx) => (
                  <label 
                    key={idx}
                    className={`relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      idx === 0 
                      ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                      : 'border-transparent bg-white dark:bg-gray-800/50 shadow-sm hover:border-black/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        idx === 0 ? 'bg-primary text-white' : 'bg-[#f2f4f7] dark:bg-gray-700 text-[#667085]'
                      }`}>
                        <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm dark:text-white">{slot.group}: {slot.days}</p>
                        <p className="text-xs text-[#667085] dark:text-gray-400">{slot.time}</p>
                      </div>
                    </div>
                    {idx === 0 ? (
                      <span className="material-symbols-outlined text-primary">check_circle</span>
                    ) : (
                      <div className="h-6 w-6 rounded-full border border-gray-300 dark:border-gray-600"></div>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Important Notice */}
          {activity.importantNote && (
            <div className="flex gap-3 p-4 rounded-xl bg-accent-terracotta/10 border border-accent-terracotta/20 mb-8">
              <span className="material-symbols-outlined text-accent-terracotta">info</span>
              <p className="text-xs text-[#8c5e4d] dark:text-accent-terracotta leading-snug">
                <span className="font-bold">{t('inscription.activity_modal.note_label')}</span> {activity.importantNote}
              </p>
            </div>
          )}
        </div>

        {/* Sticky Footer CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-6 pb-10 bg-white/80 dark:bg-[#1e3e29]/90 backdrop-blur-xl border-t border-black/5 dark:border-white/5 z-30">
          <div className="flex gap-4 items-center max-w-md mx-auto">
            <button 
              onClick={onSignUp}
              className="flex h-14 w-full items-center justify-center rounded-xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/30 active:scale-95 transition-transform"
            >
              {t('inscription.activity_modal.signup_btn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
