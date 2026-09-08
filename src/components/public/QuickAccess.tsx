import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy, UtensilsCrossed, Calendar, FileText } from 'lucide-react';

/**
 * Los cuatro sitios a los que una familia entra una y otra vez.
 *
 * Estaban todos detras de una pestana del menu inferior: extraescolars dentro de
 * «Activitats», menjador dentro de «Serveis», documents dentro de «Mes». Eso son
 * dos toques para lo que se consulta cada semana. Aqui estan a uno, en la
 * portada, justo debajo del hero.
 *
 * Mismo tratamiento visual para los cuatro a proposito: son atajos, no
 * categorias distintas, y un color por tarjeta convertia la portada en un
 * mosaico donde nada destaca.
 */
const LINKS = [
  { to: '/extraescolars', icon: Trophy, labelKey: 'nav.extraescolars', fallback: 'Extraescolars' },
  { to: '/menjador', icon: UtensilsCrossed, labelKey: 'home.menjador', fallback: 'Menjador' },
  { to: '/calendari', icon: Calendar, labelKey: 'home.calendar', fallback: 'Calendari' },
  { to: '/documents', icon: FileText, labelKey: 'nav.documents', fallback: 'Documents' },
] as const;

export function QuickAccess() {
  const { t: tStrict } = useTranslation();
  const t = tStrict as unknown as (key: string, fallback?: string) => string;

  return (
    <nav aria-label={t('home.quick_access', 'Accessos rapids')} className="px-6 mb-8">
      <ul className="grid grid-cols-4 gap-2 sm:gap-3">
        {LINKS.map(({ to, icon: Icon, labelKey, fallback }) => (
          <li key={to}>
            <Link
              to={to}
              className="h-full flex flex-col items-center justify-start gap-1.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-1 py-3 sm:py-5 shadow-sm hover:border-primary/40 hover:shadow-md active:scale-[0.98] transition-all group"
            >
              <span className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-[12px] bg-accent dark:bg-slate-700 text-secondary dark:text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <Icon className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
              </span>
              <span className="text-[11px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight text-center">
                {t(labelKey, fallback)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
