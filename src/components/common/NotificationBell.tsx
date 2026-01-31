import { useState, useEffect, useRef } from 'react';
import { Bell, X, Calendar, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ca, es } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: 'news' | 'alert' | 'info';
  link: string | null;
  start_at: string;
  end_at: string | null;
  created_at: string;
}

export function NotificationBell() {
  const { i18n } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const bellRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [bellRef]);

  const fetchNotifications = async () => {
    try {
      const now = new Date().toISOString();
      
      // 1. Fetch Manual Notifications
      const { data: manualNotifs, error: manualError } = await supabase
        .from('notifications')
        .select('*')
        .eq('active', true)
        .lte('start_at', now)
        .or(`end_at.is.null,end_at.gte.${now}`);

      if (manualError) throw manualError;

      // 2. Fetch News with Future Dates
      const { data: newsItems, error: newsError } = await supabase
        .from('news')
        .select('*')
        .eq('published', true)
        .gte('event_date', now); // Show news that have upcoming events

      if (newsError) throw newsError;

      // 3. Map News to Notifications
      const newsNotifications: Notification[] = (newsItems || []).map(item => ({
        id: `news-${item.id}`,
        title: item.title,
        message: item.excerpt,
        type: 'news',
        link: '/noticies', // Could go to specific ID if NewsPage supports it
        start_at: item.published_at || item.created_at,
        end_at: item.event_date,
        created_at: item.created_at
      }));

      // 4. Merge and Sort
      const combined = [...(manualNotifs || []), ...newsNotifications].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(combined);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Better: use state for dismissed to trigger re-render
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try {
        const stored = localStorage.getItem('dismissed_notifications');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
  });

  const activeNotifications = notifications.filter(n => !dismissed.includes(n.id));
  const unreadCount = activeNotifications.length;

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newDismissed = [...dismissed, id];
    setDismissed(newDismissed);
    localStorage.setItem('dismissed_notifications', JSON.stringify(newDismissed));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'news': return <Calendar className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-slate-500" />;
    }
  };

  const locale = i18n.language === 'ca' ? ca : es;

  return (
    <div className="relative" ref={bellRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="font-bold text-slate-800 dark:text-white">Notificacions</h3>
            <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
              {unreadCount} noves
            </span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : activeNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No tens notificacions noves</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeNotifications.map(notification => (
                  <div key={notification.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative group">
                    <button 
                      onClick={(e) => handleDismiss(notification.id, e)}
                      className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                      title="Descartar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    
                    <div className="flex gap-3">
                      <div className="mt-1 shrink-0">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-snug pr-6">
                            {notification.title}
                        </h4>
                        {notification.message && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-3">
                            {notification.message}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] text-slate-400">
                                {format(new Date(notification.start_at), "d MMM", { locale })}
                            </span>
                            
                            {notification.link && (
                                <a 
                                    href={notification.link} 
                                    className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-0.5"
                                    target={notification.link.startsWith('http') ? '_blank' : '_self'}
                                    rel="noopener noreferrer"
                                >
                                    Veure més <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {activeNotifications.length > 0 && (
             <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-center">
                 <button 
                    onClick={() => {
                        const ids = activeNotifications.map(n => n.id);
                        const newDismissed = [...dismissed, ...ids];
                        setDismissed(newDismissed);
                        localStorage.setItem('dismissed_notifications', JSON.stringify(newDismissed));
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium py-1"
                 >
                     Marcar tot com a llegit
                 </button>
             </div>
          )}
        </div>
      )}
    </div>
  );
}


