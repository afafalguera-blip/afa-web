import { Link } from 'react-router-dom';
import { ArrowUpRight, Info, Sparkles, UtensilsCrossed, Sunrise } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSettingsT } from './useSettingsT';

/**
 * Explains, per settings subsection, WHAT a price affects and WHO consumes it,
 * so the admin never has to guess which of the price screens to open.
 */
export function SettingsSectionNote({
  title,
  body,
  consumedBy
}: {
  title: string;
  body: string;
  /** Name of the SQL routine / screen that reads this value. */
  consumedBy?: string;
}) {
  const t = useSettingsT();

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-100 bg-blue-50">
      <Info className="w-[18px] h-[18px] mt-0.5 flex-shrink-0 text-blue-600" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p className="text-[13px] font-semibold text-blue-900">{title}</p>
        <p className="text-[13px] leading-5 text-blue-800">{body}</p>
        {consumedBy && (
          <p className="text-xs text-blue-700">
            {t('admin.settings.prices.consumed_by', 'Ho consumeix')}:{' '}
            <code className="px-1.5 py-0.5 rounded bg-white/70 font-mono text-[11px] text-blue-900">
              {consumedBy}
            </code>
          </p>
        )}
      </div>
    </div>
  );
}

interface ExternalPriceTarget {
  key: 'activities' | 'acollida' | 'menjador';
  to: string;
  icon: LucideIcon;
  labelKey: string;
  labelDefault: string;
  descKey: string;
  descDefault: string;
}

const EXTERNAL_PRICES: ExternalPriceTarget[] = [
  {
    key: 'activities',
    to: '/admin/activities',
    icon: Sparkles,
    labelKey: 'admin.settings.prices.activities_label',
    labelDefault: 'Preu per activitat',
    descKey: 'admin.settings.prices.activities_desc',
    descDefault:
      "El preu soci / no soci de cada extraescolar s'edita a la fitxa de l'activitat. El llegeix activity_monthly_price."
  },
  {
    key: 'acollida',
    to: '/admin/acollida',
    icon: Sunrise,
    labelKey: 'admin.settings.prices.acollida_label',
    labelDefault: "Tarifes d'acollida",
    descKey: 'admin.settings.prices.acollida_desc',
    descDefault: "Les tarifes fixes i esporàdiques d'acollida es gestionen al seu propi panell."
  },
  {
    key: 'menjador',
    to: '/admin/menjador',
    icon: UtensilsCrossed,
    labelKey: 'admin.settings.prices.menjador_label',
    labelDefault: 'Tarifes de menjador',
    descKey: 'admin.settings.prices.menjador_desc',
    descDefault: 'El preu del tiquet i de la quota fixa de menjador es gestionen al seu propi panell.'
  }
];

/**
 * Pointer to the prices that deliberately do NOT live in Settings. Shown instead
 * of duplicating the field, so there is exactly one place to change each amount.
 */
export function ExternalPricesNote({ only }: { only?: ExternalPriceTarget['key'][] }) {
  const t = useSettingsT();
  const targets = only ? EXTERNAL_PRICES.filter((target) => only.includes(target.key)) : EXTERNAL_PRICES;

  if (targets.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
      <p className="text-[13px] font-semibold text-amber-900">
        {t('admin.settings.prices.external_title', "Aquests imports NO s'editen aquí")}
      </p>
      <ul className="space-y-2">
        {targets.map(({ key, to, icon: Icon, labelKey, labelDefault, descKey, descDefault }) => (
          <li key={key}>
            <Link
              to={to}
              className="group flex items-start gap-3 rounded-md border border-amber-200 bg-white px-3 py-2.5 hover:border-amber-300 hover:bg-amber-50/60 transition-colors"
            >
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-700" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-[13px] font-medium text-neutral-900">
                  {t(labelKey, labelDefault)}
                  <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-amber-700 transition-colors" />
                </span>
                <span className="block text-xs leading-5 text-neutral-600">{t(descKey, descDefault)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
