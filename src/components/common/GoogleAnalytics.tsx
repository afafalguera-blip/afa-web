import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ConfigService, type AnalyticsConfig } from '../../services/ConfigService';

declare global {
    interface Window {
        gtag: (command: string, id: string, config?: Record<string, unknown>) => void;
    }
}

export function GoogleAnalytics() {
    const location = useLocation();
    const [config, setConfig] = useState<AnalyticsConfig | null>(null);

    useEffect(() => {
        ConfigService.getAnalyticsConfig().then(setConfig);
    }, []);

    useEffect(() => {
        if (!config?.enabled || !config.google_analytics_id) return;
        if (typeof window.gtag === 'function') {
            window.gtag('config', config.google_analytics_id, {
                page_path: location.pathname + location.search,
            });
        }
    }, [location, config]);

    return null;
}
