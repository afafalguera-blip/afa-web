import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ConfigService, type AnalyticsConfig } from '../../services/ConfigService';
import { CookieService, CONSENT_EVENT } from '../../services/CookieService';

declare global {
    interface Window {
        gtag: (command: string, id: string, config?: Record<string, unknown>) => void;
        dataLayer: unknown[];
    }
}

/** Id ya inyectado, para no cargar el script dos veces. */
let cargado: string | null = null;

/**
 * Trae gtag.js a la pagina. Solo se llama con el consentimiento dado.
 *
 * Antes esto vivia en el index.html y se ejecutaba en la primera linea de la
 * primera carga: la analitica contaba a la familia antes de que el banner de
 * cookies llegara a aparecer, y el «Acceptar» no decidia nada.
 */
function cargarGtag(id: string) {
    if (cargado === id) return;
    cargado = id;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
        // El snippet oficial empuja el propio `arguments`; gtag.js cuenta con eso.
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer.push(arguments);
    } as unknown as Window['gtag'];
    window.gtag('js', new Date() as unknown as string);

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);
}

export function GoogleAnalytics() {
    const location = useLocation();
    const [config, setConfig] = useState<AnalyticsConfig | null>(null);
    const [permitido, setPermitido] = useState(() => CookieService.hasAnalyticsConsent());

    useEffect(() => {
        ConfigService.getAnalyticsConfig().then(setConfig);
    }, []);

    // La decision puede cambiar sin recargar: el banner y la pagina de cookies
    // avisan por evento.
    useEffect(() => {
        const actualizar = () => setPermitido(CookieService.hasAnalyticsConsent());
        window.addEventListener(CONSENT_EVENT, actualizar);
        return () => window.removeEventListener(CONSENT_EVENT, actualizar);
    }, []);

    useEffect(() => {
        if (!permitido || !config?.enabled || !config.google_analytics_id) return;
        cargarGtag(config.google_analytics_id);
        window.gtag('config', config.google_analytics_id, {
            page_path: location.pathname + location.search,
            anonymize_ip: true,
        });
    }, [permitido, config, location]);

    return null;
}
