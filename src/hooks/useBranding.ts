import { useState, useEffect } from 'react';
import { ConfigService, type BrandingConfig } from '../services/ConfigService';

const DEFAULT_BRANDING: BrandingConfig = {
    site_name: "AFA Escola Falguera",
    logo_url: "https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/public/Imagenes/logo.png",
    default_hero_url: "https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/public/Imagenes/hero_escuela.png",
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
        if (cachedBranding) {
            setBranding(cachedBranding);
            return;
        }
        if (!fetchPromise) {
            fetchPromise = ConfigService.getBrandingConfig();
        }
        fetchPromise.then((data) => {
            if (data) {
                cachedBranding = data;
                setBranding(data);
                try { localStorage.setItem(BRANDING_LS_KEY, JSON.stringify(data)); } catch { /* ignore */ }
            }
        });
    }, []);

    return branding;
}
