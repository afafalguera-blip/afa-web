import { useEffect, useState } from 'react';
import { AnnouncementService, type Announcement } from '../../services/AnnouncementService';
import { Megaphone, ExternalLink } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MAINTENANCE_MODE } from '../../utils/maintenance';

export function AnnouncementBanner() {
    const { i18n } = useTranslation();
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);

    useEffect(() => {
        if (MAINTENANCE_MODE) return;
        const fetchAnnouncement = async () => {
            const data = await AnnouncementService.getLatest();
            if (data && data.is_active) {
                setAnnouncement(data);
            }
        };

        fetchAnnouncement();
    }, []);

    if (!announcement) return null;

    const currentLang = i18n.language as 'ca' | 'es' | 'en';
    const message = announcement.translations?.[currentLang] || announcement.message;

    const bgClass = {
        info: 'bg-primary dark:bg-primary-600',
        warning: 'bg-amber-500',
        success: 'bg-emerald-500'
    }[announcement.type] || 'bg-primary';

    const content = (
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-center gap-4">
            <div className="flex items-center justify-center gap-3">
                <span className="hidden sm:flex w-8 h-8 items-center justify-center bg-white/20 rounded-lg">
                    <Megaphone size={16} className="text-white" />
                </span>
                <p className="text-sm sm:text-base font-bold text-center flex items-center gap-2">
                    {message}
                    {announcement.link && <ExternalLink size={14} className="opacity-70" />}
                </p>
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`${bgClass} text-white relative z-[45] border-b border-black/10 transition-all ${announcement.link ? 'hover:brightness-110 cursor-pointer' : ''}`}
            >
                {announcement.link ? (
                    <a
                        href={announcement.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full h-full"
                    >
                        {content}
                    </a>
                ) : (
                    content
                )}
            </motion.div>
        </AnimatePresence>
    );
}
