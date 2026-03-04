import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
    interface Window {
        gtag: (command: string, id: string, config?: Record<string, unknown>) => void;
    }
}

export function GoogleAnalytics() {
    const location = useLocation();

    useEffect(() => {
        if (typeof window.gtag === 'function') {
            window.gtag('config', 'G-2DMTERT1FH', {
                page_path: location.pathname + location.search,
            });
        }
    }, [location]);

    return null;
}
