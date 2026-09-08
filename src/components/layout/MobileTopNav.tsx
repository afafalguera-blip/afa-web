import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { NotificationBell } from '../common/NotificationBell';
import { useBranding } from '../../hooks/useBranding';

const LANGS = ['ca', 'es', 'en'] as const;

/**
 * Barra superior del movil.
 *
 * Cabecera de una sola linea: marca a la izquierda, idioma y campana a la
 * derecha. Antes eran tres capsulas de idioma siempre desplegadas, la campana y
 * un escudo azul de admin; en 390 px de ancho eso es media pantalla de controles
 * antes de que empiece el contenido. El idioma se pliega en un desplegable (la
 * familia elige el suyo una vez, no cada visita) y el acceso al panel vive en
 * «Mes», que es donde se busca lo que se usa poco.
 */
export function MobileTopNav() {
  const { i18n, t } = useTranslation();
  const branding = useBranding();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!langOpen) return;
    const close = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [langOpen]);

  const current = LANGS.find((l) => i18n.language?.startsWith(l)) ?? 'ca';

  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-white/10 z-50 flex items-center justify-between px-4 lg:hidden">
      <Link to="/" className="flex items-center gap-2.5 min-w-0 active:scale-95 transition-transform">
        <img
          alt="AFA Escola Falguera"
          className="w-9 h-9 rounded-[12px] object-contain bg-white border border-slate-100 dark:border-slate-700 p-0.5 shrink-0"
          src={branding.logo_url}
        />
        <span className="font-bold text-sm text-secondary dark:text-white leading-tight truncate">
          {branding.site_name}
        </span>
      </Link>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative" ref={langRef}>
          <button
            type="button"
            onClick={() => setLangOpen((v) => !v)}
            aria-expanded={langOpen}
            aria-label={t('common.language', 'Idioma')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-[12px] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span translate="no" className="notranslate text-xs font-bold">
              {current.toUpperCase()}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
          </button>

          {langOpen && (
            <div className="absolute right-0 mt-2 w-20 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
              {LANGS.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  translate="no"
                  onClick={() => {
                    i18n.changeLanguage(lang);
                    setLangOpen(false);
                  }}
                  className={`notranslate w-full px-3 py-2 text-xs font-bold text-left transition-colors ${
                    lang === current
                      ? 'bg-accent dark:bg-slate-800 text-primary'
                      : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        <NotificationBell />
      </div>
    </div>
  );
}
