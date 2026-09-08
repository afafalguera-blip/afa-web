import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Share, X } from 'lucide-react';
import { CookieService } from '../../services/CookieService';

/** El evento no está en lib.dom: solo lo implementan los navegadores Chromium. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISSED_KEY = 'afa_pwa_install_dismissed';

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iPadOS 13+ se anuncia como Macintosh: sin el táctil no se distingue. */
const isIos = () => {
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
};

const wasDismissed = () => {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

export function InstallPrompt() {
  const { t } = useTranslation();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setShowIosHint(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // Safari no dispara nunca beforeinstallprompt: en iOS instalar es un gesto
    // manual del menú Compartir, así que lo único que se puede ofrecer es la
    // explicación. El retardo evita tapar la pantalla nada más entrar.
    const timer = isIos() ? window.setTimeout(() => setShowIosHint(true), 4000) : undefined;

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Modo privado: se volverá a ofrecer en la siguiente visita.
    }
    setDeferred(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    // El evento solo se puede usar una vez; el navegador vuelve a emitirlo si
    // el usuario rechaza y sigue cumpliendo los criterios de instalación.
    setDeferred(null);
  };

  // Sin consentimiento de cookies el banner de cookies ocupa esta misma esquina:
  // esperamos a que se resuelva para no apilar dos avisos.
  if (!CookieService.hasConsent()) return null;
  if (!deferred && !showIosHint) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-6 left-6 right-6 lg:left-auto lg:right-6 lg:max-w-md z-[100] animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl shadow-primary/10 border border-slate-100 dark:border-slate-700 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/10 text-secondary dark:text-primary rounded-2xl flex items-center justify-center shrink-0">
            {deferred ? <Download size={24} /> : <Share size={24} />}
          </div>
          <div className="space-y-2 min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center justify-between gap-2">
              {t('pwa.install.title', "Instal·la l'app de l'AFA")}
              <button
                type="button"
                onClick={dismiss}
                aria-label={t('pwa.install.dismiss', 'Ara no')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
              >
                <X size={18} />
              </button>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {deferred
                ? t('pwa.install.body', "Afegeix la web a la pantalla d'inici i obre-la com una app, sense navegador.")
                : t('pwa.install.ios_body', "Obre el menú Compartir del navegador i tria «Afegeix a la pantalla d'inici».")}
            </p>
            {deferred && (
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={install}
                  className="flex-1 bg-primary text-white text-xs font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
                >
                  {t('pwa.install.action', 'Instal·lar')}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="flex-1 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-200 text-xs font-bold py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
                >
                  {t('pwa.install.dismiss', 'Ara no')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
