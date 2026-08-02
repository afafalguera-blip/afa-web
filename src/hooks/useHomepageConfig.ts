import { useState, useEffect } from 'react';
import { ConfigService, type HomepageConfig } from '../services/ConfigService';

const DEFAULT_HOMEPAGE: HomepageConfig = {
    featured_news_count: 3,
    featured_events_count: 4,
    featured_projects_count: 3,
    max_students_per_inscription: 3,
    calendar_events_per_day: 3,
    assemblea_pdf_url: '',
};

let cachedHomepage: HomepageConfig | null = null;
let fetchPromise: Promise<HomepageConfig | null> | null = null;

export function invalidateHomepageCache() {
    cachedHomepage = null;
    fetchPromise = null;
}

export function useHomepageConfig(): HomepageConfig {
    // Lazy initialiser already reads the cache, so a warm cache needs no effect.
    const [config, setConfig] = useState<HomepageConfig>(() => cachedHomepage || DEFAULT_HOMEPAGE);

    useEffect(() => {
        if (cachedHomepage) return;

        let cancelled = false;
        if (!fetchPromise) {
            fetchPromise = ConfigService.getHomepageConfig();
        }
        fetchPromise.then((data) => {
            if (cancelled || !data) return;
            cachedHomepage = data;
            setConfig(data);
        });

        return () => { cancelled = true; };
    }, []);

    return config;
}
