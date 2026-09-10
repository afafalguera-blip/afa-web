import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check, Link2, Loader2, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';

import { useToast } from '../../../components/common/Toast';
import { AdminChildrenService } from '../../../services/admin/AdminChildrenService';
import type { RosterImportReport } from '../../../services/admin/AdminChildrenService';
import { ConfigService } from '../../../services/ConfigService';
import { findDuplicates, parseChildrenCsv } from '../../../logic/childrenImport';
import { COURSES, COURSE_BY_CODE, isCourseCode } from '../../../constants/courses';
import type { AcollidaMonitorLink, Child } from '../../../types/acollida';

const inputClass =
  'rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white';

const SOURCE_LABELS: Record<Child['source'], string> = {
  manual: 'A mà',
  import: 'Importat',
  acollida: 'Acollida',
  inscripcions: 'Extraescolars',
};

/**
 * The centre's roll of children, and the links the monitors use to take the
 * register.
 *
 * The roll started itself from what was already written down — every child in
 * an acollida request or an extraescolars enrolment — so it is useful from day
 * one, and the school's full list can be dropped on top as a CSV without
 * duplicating anybody.
 */
export function ChildrenTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [children, setChildren] = useState<Child[]>([]);
  const [links, setLinks] = useState<AcollidaMonitorLink[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // De quin curs escolar és el llistat. Per defecte, el curs actiu: importar el
  // llistat de setembre a l'any equivocat matricularia tota l'escola on no toca.
  const [importYear, setImportYear] = useState('');
  const [fullRoster, setFullRoster] = useState(false);
  const [report, setReport] = useState<RosterImportReport | null>(null);

  const [draft, setDraft] = useState({ name: '', surname: '', course: '' });

  // El llistat del centre no porta contacte: qui en surt entra sense correu ni
  // telèfon i s'omple aquí quan la família el dona.
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [editing, setEditing] = useState<{ id: string; email: string; phone: string } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roll, monitorLinks] = await Promise.all([
        AdminChildrenService.getAll(search),
        AdminChildrenService.getLinks(),
      ]);
      setChildren(roll);
      setLinks(monitorLinks);
      setError(null);
    } catch (err) {
      console.error('Error loading children:', err);
      setError(t('admin.children.load_error', "No s'ha pogut carregar el cens."));
    } finally {
      setLoading(false);
    }
  }, [search, t]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  useEffect(() => {
    let cancelled = false;
    ConfigService.getSeasonConfig()
      .then((season) => {
        if (!cancelled && season?.active_year) setImportYear(season.active_year);
      })
      .catch((err) => console.error('Error loading season:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  // The roll filled itself from years of enrolments, so the same child can be
  // in it twice with two different courses. Nobody spots that scrolling.
  const duplicates = useMemo(() => findDuplicates(children), [children]);

  const missingContact = useMemo(
    () => children.filter((child) => !child.family_email && !child.family_phone),
    [children],
  );

  const visible = onlyMissing ? missingContact : children;

  const byCourse = useMemo(() => {
    const counts = new Map<string, number>();
    for (const child of children) counts.set(child.course, (counts.get(child.course) || 0) + 1);
    return counts;
  }, [children]);

  const handleImport = async (file: File) => {
    if (!importYear.trim()) {
      toast.error(t('admin.children.import_no_year', 'Digues de quin curs escolar és el llistat.'));
      return;
    }

    setImporting(true);
    setReport(null);
    try {
      const { rows, problems } = parseChildrenCsv(await file.text());

      if (rows.length === 0) {
        toast.error(problems[0]?.reason || t('admin.children.import_empty', 'No hi ha res per importar.'));
        return;
      }

      const result = await AdminChildrenService.importRoster(importYear.trim(), rows, fullRoster);
      setReport(result);
      toast.success(
        t('admin.children.imported', '{{count}} infants matriculats al {{year}}', {
          count: result.matriculats,
          year: result.academic_year,
        }),
      );

      if (result.homonims > 0) {
        toast.error(
          t(
            'admin.children.import_homonyms',
            '{{count}} línies tenen el mateix nom i cognoms que una altra: només n\'ha entrat una. Revisa-les.',
            { count: result.homonims },
          ),
        );
      }

      if (problems.length > 0) {
        // Naming the lines is the whole point: a silent import hides the
        // children that did not make it in.
        toast.error(
          t('admin.children.import_problems', '{{count}} línies no s\'han pogut llegir: {{detail}}', {
            count: problems.length,
            detail: problems.slice(0, 3).map((p) => `l. ${p.line} (${p.reason})`).join('; '),
          }),
        );
      }
      await load();
    } catch (err) {
      console.error('Error importing children:', err);
      toast.error(t('admin.children.import_error', "No s'ha pogut importar el fitxer."));
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const addChild = async () => {
    if (!draft.name.trim() || !draft.surname.trim() || !draft.course) return;
    try {
      await AdminChildrenService.create(draft);
      setDraft({ name: '', surname: '', course: '' });
      await load();
    } catch (err) {
      console.error('Error creating child:', err);
      toast.error(t('admin.children.save_error', "No s'ha pogut desar l'infant."));
    }
  };

  const saveContact = async () => {
    if (!editing) return;
    setSavingId(editing.id);
    try {
      await AdminChildrenService.update(editing.id, {
        family_email: editing.email.trim() || null,
        family_phone: editing.phone.trim() || null,
      });
      setEditing(null);
      await load();
    } catch (err) {
      console.error('Error saving contact:', err);
      toast.error(t('admin.children.save_error', "No s'ha pogut desar l'infant."));
    } finally {
      setSavingId(null);
    }
  };

  const removeChild = async (child: Child) => {
    if (!window.confirm(t('admin.children.confirm_delete', 'Treure {{name}} del cens?', { name: `${child.name} ${child.surname}` }))) return;
    try {
      await AdminChildrenService.remove(child.id);
      await load();
    } catch (err) {
      console.error('Error deleting child:', err);
      toast.error(t('admin.children.delete_error', "No s'ha pogut esborrar. Potser té assistències registrades."));
    }
  };

  const newLink = async (group: 'mati' | 'tarda') => {
    try {
      await AdminChildrenService.createLink(group === 'mati' ? 'Monitoratge matí' : 'Monitoratge tarda', group);
      await load();
    } catch (err) {
      console.error('Error creating link:', err);
      toast.error(t('admin.children.link_error', "No s'ha pogut crear l'enllaç."));
    }
  };

  const linkUrl = (link: AcollidaMonitorLink) => `${window.location.origin}/acollida/llista/${link.token}`;

  const copyLink = async (link: AcollidaMonitorLink) => {
    await navigator.clipboard.writeText(linkUrl(link));
    toast.success(t('admin.children.link_copied', 'Enllaç copiat'));
  };

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white">
              {t('admin.children.links_title', 'Enllaços per passar llista')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              {t(
                'admin.children.links_hint',
                "Obren la llista del dia al mòbil, sense contrasenya. Donen accés a noms d'infants: comparteix-los només amb qui passa llista i desactiva'ls quan deixin de fer falta.",
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => newLink('mati')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">
              <Plus className="w-4 h-4" /> {t('admin.children.link_morning', 'Matí')}
            </button>
            <button type="button" onClick={() => newLink('tarda')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200">
              <Plus className="w-4 h-4" /> {t('admin.children.link_afternoon', 'Tarda')}
            </button>
          </div>
        </div>

        {links.length === 0 ? (
          <p className="text-sm text-slate-500">{t('admin.children.no_links', 'Encara no hi ha cap enllaç.')}</p>
        ) : (
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.id} className="flex items-center gap-3 flex-wrap rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${link.active ? 'bg-green-500' : 'bg-slate-300'}`} />
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{link.label}</span>
                <code className="text-[11px] text-slate-500 truncate max-w-[16rem]">…{link.token.slice(-8)}</code>
                <span className="text-xs text-slate-400">
                  {link.last_used_at
                    ? t('admin.children.link_used', 'Fet servir el {{date}}', {
                        date: new Date(link.last_used_at).toLocaleDateString('ca'),
                      })
                    : t('admin.children.link_unused', 'Sense fer servir')}
                </span>
                <div className="ml-auto flex gap-2">
                  <button type="button" onClick={() => copyLink(link)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                    <Link2 className="w-3.5 h-3.5" /> {t('admin.children.copy', 'Copiar')}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await AdminChildrenService.setLinkActive(link.id, !link.active);
                      await load();
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  >
                    {link.active ? t('admin.children.revoke', 'Desactivar') : t('admin.children.enable', 'Activar')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="child_search">
              {t('admin.children.search', 'Buscar')}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="child_search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('admin.children.search_placeholder', 'Nom o cognom')}
                className={`${inputClass} w-full pl-9`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="import_year">
              {t('admin.children.import_year', 'Curs escolar del llistat')}
            </label>
            <input
              id="import_year"
              value={importYear}
              onChange={(e) => setImportYear(e.target.value)}
              placeholder="2026-27"
              className={`${inputClass} w-28`}
            />
          </div>

          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {t('admin.children.import', 'Importar CSV')}
          </button>
        </div>

        <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={fullRoster}
            onChange={(e) => setFullRoster(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            {t(
              'admin.children.import_full',
              'És el llistat sencer del centre: dona de baixa qui no hi surti.',
            )}{' '}
            <span className="text-slate-400">
              {t(
                'admin.children.import_full_warning',
                'No ho marquis si només importes un curs: donaries de baixa tota la resta.',
              )}
            </span>
          </span>
        </label>

        <p className="text-xs text-slate-500">
          {t(
            'admin.children.import_hint',
            'El CSV necessita les columnes nom, cognoms i curs (número de llista, correu i telèfon, opcionals). Serveix el que exporta l\'Excel del centre, amb comes o punt i coma. Tornar-lo a importar actualitza, no duplica: el llistat mana sobre el nom i el curs, i mai esborra el contacte que ja tinguem.',
          )}
        </p>

        {report && (
          <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center rounded-xl bg-slate-50 dark:bg-slate-950 p-3">
            {[
              { k: t('admin.children.report_read', 'Llegides'), v: report.llegides },
              { k: t('admin.children.report_new', 'Nous'), v: report.nous },
              { k: t('admin.children.report_updated', 'Actualitzats'), v: report.actualitzats },
              { k: t('admin.children.report_enrolled', 'Matriculats'), v: report.matriculats },
              { k: t('admin.children.report_deactivated', 'De baixa'), v: report.donats_baixa },
            ].map((cell) => (
              <div key={cell.k}>
                <dt className="text-[11px] uppercase tracking-wide text-slate-400">{cell.k}</dt>
                <dd className="text-lg font-bold text-slate-800 dark:text-slate-100">{cell.v}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="flex items-end gap-2 flex-wrap pt-3 border-t border-slate-100 dark:border-slate-800">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder={t('admin.children.name', 'Nom')}
            className={inputClass}
          />
          <input
            value={draft.surname}
            onChange={(e) => setDraft({ ...draft, surname: e.target.value })}
            placeholder={t('admin.children.surname', 'Cognoms')}
            className={inputClass}
          />
          <select value={draft.course} onChange={(e) => setDraft({ ...draft, course: e.target.value })} className={inputClass}>
            <option value="">{t('admin.children.course', 'Curs')}</option>
            {COURSES.map((course) => (
              <option key={course.code} value={course.code}>
                {t(course.i18nKey, course.label)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addChild}
            disabled={!draft.name.trim() || !draft.surname.trim() || !draft.course}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold"
          >
            <Plus className="w-4 h-4" /> {t('admin.children.add', 'Afegir')}
          </button>
        </div>
      </section>

      {duplicates.length > 0 && (
        <section className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-5">
          <p className="font-bold text-amber-900 dark:text-amber-200">
            {t('admin.children.duplicates_title', '{{count}} infants repetits', { count: duplicates.length })}
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
            {t(
              'admin.children.duplicates_hint',
              "El mateix nom surt en dos cursos: ve d'inscripcions de cursos diferents. Esborra la fila del curs antic perquè a la llista de la monitora no hi surti dues vegades.",
            )}
          </p>
          <ul className="mt-3 space-y-1 text-sm text-amber-900 dark:text-amber-200">
            {duplicates.map((group) => (
              <li key={group[0].id}>
                <strong>{group[0].name} {group[0].surname}</strong>
                {' · '}
                {group
                  .map((c) => (isCourseCode(c.course) ? COURSE_BY_CODE[c.course].label : c.course))
                  .join(' / ')}
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <p className="font-black text-slate-900 dark:text-white">
            {t('admin.children.count', '{{count}} infants', { count: visible.length })}
          </p>
          {missingContact.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <input
                type="checkbox"
                checked={onlyMissing}
                onChange={(e) => setOnlyMissing(e.target.checked)}
              />
              {t('admin.children.only_missing_contact', 'Només els {{count}} sense contacte', {
                count: missingContact.length,
              })}
            </label>
          )}
          <p className="text-xs text-slate-500">
            {[...byCourse.entries()]
              .sort()
              .map(([code, n]) => `${isCourseCode(code) ? COURSE_BY_CODE[code].label : code}: ${n}`)
              .join(' · ')}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 text-slate-500 py-10">
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('common.loading', 'Carregant...')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-2 font-medium">{t('admin.children.name', 'Nom')}</th>
                  <th className="px-5 py-2 font-medium">{t('admin.children.course', 'Curs')}</th>
                  <th className="px-5 py-2 font-medium">{t('admin.children.contact', 'Contacte')}</th>
                  <th className="px-5 py-2 font-medium">{t('admin.children.origin', 'Origen')}</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {visible.map((child) => (
                  <tr key={child.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-5 py-2.5 font-semibold text-slate-800 dark:text-slate-100">
                      {child.surname}, {child.name}
                    </td>
                    <td className="px-5 py-2.5 text-slate-600 dark:text-slate-300">
                      {isCourseCode(child.course) ? COURSE_BY_CODE[child.course].label : child.course}
                    </td>
                    <td className="px-5 py-2.5">
                      {editing?.id === child.id ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <input
                            value={editing.email}
                            onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                            placeholder={t('admin.children.email', 'Correu')}
                            className={`${inputClass} py-1 w-52`}
                          />
                          <input
                            value={editing.phone}
                            onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                            placeholder={t('admin.children.phone', 'Telèfon')}
                            className={`${inputClass} py-1 w-32`}
                          />
                          <button
                            type="button"
                            onClick={saveContact}
                            disabled={savingId === child.id}
                            aria-label={t('common.save', 'Desar')}
                            className="text-green-600 disabled:opacity-50"
                          >
                            {savingId === child.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            aria-label={t('common.cancel', 'Cancel·lar')}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({
                              id: child.id,
                              email: child.family_email || '',
                              phone: child.family_phone || '',
                            })
                          }
                          className="group inline-flex items-center gap-1.5 text-left text-xs"
                        >
                          <span
                            className={
                              child.family_email || child.family_phone
                                ? 'text-slate-600 dark:text-slate-300'
                                : 'text-amber-600 dark:text-amber-400 font-semibold'
                            }
                          >
                            {[child.family_email, child.family_phone].filter(Boolean).join(' · ') ||
                              t('admin.children.no_contact', 'Sense contacte')}
                          </span>
                          <Pencil className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-slate-500 text-xs">{SOURCE_LABELS[child.source]}</td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeChild(child)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        aria-label={t('admin.children.delete', 'Esborrar')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                      {onlyMissing
                        ? t('admin.children.all_with_contact', 'Tots els infants tenen contacte.')
                        : t('admin.children.empty', 'Cap infant al cens encara.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default ChildrenTab;
