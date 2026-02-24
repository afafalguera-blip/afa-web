import { useEffect, useState } from 'react';
import { AnnouncementService, type Announcement } from '../../services/AnnouncementService';
import { Megaphone, ExternalLink } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function AnnouncementBanner() {
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);

    useEffect(() => {
        const fetchAnnouncement = async () => {
            const data = await AnnouncementService.getLatest();
            if (data && data.is_active) {
                setAnnouncement(data);
            }
        };

        fetchAnnouncement();
    }, []);

    if (!announcement) return null;

    const bgClass = {
        info: 'bg-primary dark:bg-primary-600',
        warning: 'bg-amber-500',
        success: 'bg-emerald-500'
    }[announcement.type] || 'bg-primary';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`${bgClass} text-white relative z-[45] border-b border-black/10`}
            >
                <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-center gap-4">
                    <div className="flex items-center justify-center gap-3">
                        <span className="hidden sm:flex w-8 h-8 items-center justify-center bg-white/20 rounded-lg">
                            <Megaphone size={16} className="text-white" />
                        </span>
                        <p className="text-sm sm:text-base font-bold text-center">
                            {announcement.message}
                            {announcement.link && (
                                <a
                                    href={announcement.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 ml-2 underline decoration-2 underline-offset-4 hover:text-white/80 transition-colors"
                                >
                                    Més info <ExternalLink size={14} />
                                </a>
                            )}
                        </p>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
