import { useState, useEffect } from 'react';
import { ConfigService, type BrandingConfig } from '../services/ConfigService';
import { proxyStorageUrl } from '../utils/storageUrl';

const DEFAULT_BRANDING: BrandingConfig = {
    site_name: "AFA Escola Falguera",
    logo_url: "/storage/object/public/Imagenes/logo.png",
    default_hero_url: "/storage/object/public/Imagenes/hero.png",
    default_placeholder_url: "https://images.unsplash.com/photo-1504711432869-5d39a110fdd7?q=80&w=2070&auto=format&fit=crop",
    default_seo_description: {
        ca: "Web oficial de l'AFA de l'Escola Falguera.",
        es: "Web oficial del AFA de la Escola Falguera.",
        en: "Official website of AFA Escola Falguera."
    }
};

const BRANDING_LS_KEY = 'afa_branding';

let cachedBranding: BrandingConfig | null = null;
let fetchPromise: Promise<BrandingConfig | null> | null = null;

// Hydrate in-memory cache from localStorage on module load
try {
    const stored = localStorage.getItem(BRANDING_LS_KEY);
    if (stored) cachedBranding = JSON.parse(stored);
} catch { /* ignore */ }

export function invalidateBrandingCache() {
    cachedBranding = null;
    fetchPromise = null;
    try { localStorage.removeItem(BRANDING_LS_KEY); } catch { /* ignore */ }
}

export function useBranding(): BrandingConfig {
    const [branding, setBranding] = useState<BrandingConfig>(cachedBranding || DEFAULT_BRANDING);

    useEffect(() => {
        let cancelled = false;

        // Show cached value instantly, but ALWAYS revalidate in the background.
        // Without this, a stale localStorage branding (e.g. an old hero/logo URL
        // pointing to a file that no longer exists) stays pinned forever.
        if (cachedBranding) setBranding(cachedBranding);

        if (!fetchPromise) {
            fetchPromise = ConfigService.getBrandingConfig().finally(() => { fetchPromise = null; });
        }
        fetchPromise.then((data) => {
            if (cancelled || !data) return;
            const proxied = {
                ...data,
                logo_url: proxyStorageUrl(data.logo_url) || DEFAULT_BRANDING.logo_url,
                default_hero_url: proxyStorageUrl(data.default_hero_url) || DEFAULT_BRANDING.default_hero_url,
            };
            cachedBranding = proxied;
            setBranding(proxied);
            try { localStorage.setItem(BRANDING_LS_KEY, JSON.stringify(proxied)); } catch { /* ignore */ }
        });

        return () => { cancelled = true; };
    }, []);

    return branding;
}
