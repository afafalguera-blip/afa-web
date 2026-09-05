import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';

import { SEO } from '../components/common/SEO';
import { AcollidaService, AcollidaRateLimitError } from '../services/AcollidaService';
import { useContentTranslation } from '../hooks/useContentTranslation';
import { COURSES } from '../constants/courses';
import { formatEuro, occasionalCharge, unitPrice } from '../logic/acollidaPricing';
import { OccasionalDatesPicker } from '../features/acollida/components/OccasionalDatesPicker';
import { availableWeekdays } from '../logic/acollidaCapacity';
import { toIsoDate } from '../logic/acollidaCalendar';
import {
  ACOLLIDA_WEEKDAYS,
  WEEKDAY_I18N_KEYS,
  type AcollidaModality,
  type AcollidaRate,
  type AcollidaWeekday,
  type AcollidaInscriptionInput,
} from '../types/acollida';

const MAX_CHILDREN = 3;

interface ChildDraft {
  name: string;
  surname: string;
  course: string;
  rateId: string;
  modality: AcollidaModality;
  weekdays: AcollidaWeekday[];
  dates: string[];
}

/**
 * A new child starts with the five weekdays already ticked. The common case by
 * far is "every day", and the family that needs fewer unticks them — which is
 * one click less than the empty list, and removes the "did I have to choose?"
 * doubt that left the old form's day question blank on every single answer.
 */
const emptyChild = (): ChildDraft => ({
  name: '',
  surname: '',
  course: '',
  rateId: '',
  modality: 'mensual',
  weekdays: [...ACOLLIDA_WEEKDAYS],
  dates: [],
});

/**
 * A second or third child starts as a copy of the previous one: same slot, same
 * modality, same days. Brothers and sisters are dropped off together — asking
 * the family to answer the same three questions again is asking them to repeat
 * themselves, and the name and course, the only two things that really differ,
 * stay empty and waiting.
 */
const siblingDraft = (previous: ChildDraft | undefined, rates: AcollidaRate[]): ChildDraft => {
  const base = emptyChild();
  if (!previous) return { ...base, rateId: rates.length === 1 ? rates[0].id : '' };
  return {
    ...base,
    rateId: previous.rateId,
    modality: previous.modality,
    weekdays: [...previous.weekdays],
    dates: [...previous.dates],
  };
};

const card = 'bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8';
const inputClass =
  'block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-base text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition';
const labelClass = 'block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2';

export default function AcollidaInscriptionPage() {
  const { t, i18n } = useTranslation();
  const { tContent } = useContentTranslation();

  const [rates, setRates] = useState<AcollidaRate[]>([]);
  const [loadingRates, setLoadingRates] = useState(true);

  const [children, setChildren] = useState<ChildDraft[]>([emptyChild()]);
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);

  /**
   * Full days, keyed by rate. Two children on the same slot share the answer,
   * and the key is the rate because the seats belong to the room the slot is
   * in, not to the child.
   */
  const [fullDays, setFullDays] = useState<Record<string, string[]>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedToWaitlist, setSubmittedToWaitlist] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    AcollidaService.getRates()
      .then((data) => {
        if (cancelled) return;
        setRates(data);
        // One slot on offer is not a choice: pick it and save the family a click.
        if (data.length === 1) {
          setChildren((prev) => prev.map((c) => ({ ...c, rateId: data[0].id })));
        }
      })
      .catch((err) => {
        console.error('Error fetching acollida rates:', err);
        if (!cancelled) setError(t('acollida_form.error_rates', 'No hem pogut carregar les tarifes. Torna-ho a provar en un moment.'));
      })
      .finally(() => {
        if (!cancelled) setLoadingRates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const rateById = useMemo(() => new Map(rates.map((r) => [r.id, r])), [rates]);

  /**
   * Asks the database which days of a month have no seat left. Cheap enough to
   * repeat on every month change, and it must be fresh: a place taken while the
   * family was filling the form has to show up before they send it.
   */
  const loadFullDays = useCallback(async (rateId: string, year: number, month: number) => {
    if (!rateId) return;
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = toIsoDate(new Date(year, month, 0));
    try {
      const days = await AcollidaService.getFullDays(rateId, from, to);
      setFullDays((prev) => ({
        ...prev,
        [rateId]: [...new Set([...(prev[rateId] || []), ...days])],
      }));
    } catch (err) {
      // A failed lookup must not block the sign-up: worst case the family asks
      // for a full day and the AFA puts it on the waiting list, as before.
      console.error('Error fetching acollida occupancy:', err);
    }
  }, []);

  // The month a monthly sign-up would start in decides which weekdays are left.
  useEffect(() => {
    const today = new Date();
    for (const rateId of new Set(children.map((c) => c.rateId).filter(Boolean))) {
      loadFullDays(rateId, today.getFullYear(), today.getMonth() + 1);
      const next = today.getMonth() === 11
        ? { y: today.getFullYear() + 1, m: 1 }
        : { y: today.getFullYear(), m: today.getMonth() + 2 };
      loadFullDays(rateId, next.y, next.m);
    }
  }, [children, loadFullDays]);

  const updateChild = (index: number, patch: Partial<ChildDraft>) => {
    setChildren((prev) => prev.map((child, i) => (i === index ? { ...child, ...patch } : child)));
  };

  const toggleWeekday = (index: number, day: AcollidaWeekday) => {
    setChildren((prev) =>
      prev.map((child, i) => {
        if (i !== index) return child;
        const has = child.weekdays.includes(day);
        return {
          ...child,
          weekdays: has ? child.weekdays.filter((d) => d !== day) : [...child.weekdays, day].sort((a, b) => a - b),
        };
      }),
    );
  };


  /**
   * Monthly total for the family. Occasional sign-ups are priced per day, so
   * they are counted with the days actually booked; that is the same arithmetic
   * `generate_acollida_payments()` does, so what the family reads here is what
   * the receipt will say.
   */
  const summary = useMemo(() => {
    if (isMember === null) return null;
    let total = 0;
    let complete = true;

    for (const child of children) {
      const rate = rateById.get(child.rateId);
      if (!rate) {
        complete = false;
        continue;
      }
      if (child.modality === 'mensual') {
        const price = unitPrice(rate, isMember, 'mensual');
        if (price == null) complete = false;
        else total += price;
      } else {
        const charge = occasionalCharge(rate, isMember, child.dates.length);
        if (charge == null) complete = false;
        else total += charge.amount;
      }
    }

    return { total, complete };
  }, [children, isMember, rateById]);

  const validate = (): string | null => {
    if (!parentName.trim()) return t('acollida_form.error_parent_name', 'Falta el nom del pare, mare o tutor/a.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail.trim())) return t('acollida_form.error_email', 'El correu electrònic no és vàlid.');
    if (!parentPhone.trim()) return t('acollida_form.error_phone', 'Falta el telèfon de contacte.');
    if (isMember === null) return t('acollida_form.error_member', 'Digues-nos si sou família sòcia de l\'AFA.');

    for (const child of children) {
      if (!child.name.trim() || !child.surname.trim()) return t('acollida_form.error_child_name', 'Falten el nom i els cognoms d\'algun infant.');
      if (!child.course) return t('acollida_form.error_course', 'Falta el curs d\'algun infant.');
      if (!child.rateId) return t('acollida_form.error_rate', 'Falta triar la franja horària d\'algun infant.');
      if (child.modality === 'mensual' && child.weekdays.length === 0) return t('acollida_form.error_weekdays', 'Tria almenys un dia de la setmana.');
      if (child.modality === 'ocasional' && child.dates.length === 0) return t('acollida_form.error_dates', 'Afegeix les dates que necessiteu.');
    }

    if (!consent) return t('acollida_form.error_consent', 'Cal acceptar el tractament de dades per poder gestionar la plaça.');
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    setError(null);

    // The database has the last word on the status — the room can fill up while
    // the form is open — but this is what we knew when the family pressed send.
    setSubmittedToWaitlist(
      children.some((child) => {
        const days = fullDays[child.rateId] || [];
        return child.modality === 'ocasional'
          ? child.dates.some((d) => days.includes(d))
          : child.weekdays.some((d) => !availableWeekdays(days).includes(d));
      }),
    );

    const rows: AcollidaInscriptionInput[] = children.map((child) => ({
      child_name: child.name.trim(),
      child_surname: child.surname.trim(),
      course: child.course,
      rate_id: child.rateId,
      modality: child.modality,
      weekdays: child.modality === 'mensual' ? child.weekdays : [],
      occasional_dates: child.modality === 'ocasional' ? child.dates : [],
      parent_name: parentName.trim(),
      parent_email: parentEmail.trim(),
      parent_phone: parentPhone.trim(),
      afa_member: isMember === true,
      notes: notes.trim() || null,
      form_language: i18n.resolvedLanguage || i18n.language || 'ca',
    }));

    try {
      await AcollidaService.submitInscriptions(rows);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof AcollidaRateLimitError
          ? t('acollida_form.error_rate_limit', 'Hem rebut la sol·licitud fa un moment. Espera un minut abans de tornar-ho a enviar.')
          : t('acollida_form.error_submit', 'No hem pogut enviar la sol·licitud. Torna-ho a provar en un moment.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <>
        <SEO title={t('acollida_form.seo_title', "Sol·licitud del servei d'acollida")} />
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-16">
          <div className="max-w-2xl mx-auto px-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-green-200 dark:border-green-900/40 shadow-sm overflow-hidden">
              <div className="bg-green-600 px-6 py-10 text-center">
                <div className="w-16 h-16 bg-white text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  {t('acollida_form.success_title', 'Sol·licitud rebuda')}
                </h1>
              </div>
              <div className="p-6 sm:p-8 text-center space-y-4">
                <p className="text-slate-600 dark:text-slate-300">
                  {submittedToWaitlist
                    ? t('acollida_form.success_body_waitlist', "Algun dels dies estava complet, així que quedeu a la llista d'espera d'aquests dies. Us avisarem a la primera baixa; la resta de dies segueixen el camí normal.")
                    : t('acollida_form.success_body', "Us escriurem per confirmar la plaça i la tarifa. Si heu de canviar alguna cosa, contacteu amb l'AFA.")}
                </p>
                <Link
                  to="/acollida"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold transition-colors"
                >
                  {t('acollida_form.back_to_info', "Tornar a la informació del servei")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title={t('acollida_form.seo_title', "Sol·licitud del servei d'acollida")}
        description={t('acollida_form.seo_description', "Demana plaça al servei d'acollida de l'AFA Falguera: tria la franja, els dies i rep la confirmació.")}
      />

      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">

          <header className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-widest rounded-full">
              <ClipboardList className="w-3.5 h-3.5" />
              {t('acollida_form.eyebrow', "Servei d'acollida")}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              {t('acollida_form.title', 'Demanar plaça')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {t('acollida_form.intro', "Tres minuts. Ompliu una sola vegada per família, encara que tingueu més d'un infant.")}
            </p>
          </header>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Contact first: the membership answer decides every price below it. */}
            <section className={card}>
              <h2 className="text-lg font-black text-slate-900 dark:text-white mb-5">
                {t('acollida_form.contact_title', 'Dades de contacte')}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="parent_name">
                    {t('acollida_form.parent_name', 'Nom i cognoms del pare, mare o tutor/a')} <span className="text-red-500">*</span>
                  </label>
                  <input id="parent_name" className={inputClass} value={parentName} onChange={(e) => setParentName(e.target.value)} autoComplete="name" />
                </div>

                <div>
                  <label className={labelClass} htmlFor="parent_email">
                    {t('acollida_form.email', 'Correu electrònic')} <span className="text-red-500">*</span>
                  </label>
                  <input id="parent_email" type="email" inputMode="email" autoComplete="email" className={inputClass} value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} />
                </div>

                <div>
                  <label className={labelClass} htmlFor="parent_phone">
                    {t('acollida_form.phone', 'Telèfon')} <span className="text-red-500">*</span>
                  </label>
                  <input id="parent_phone" type="tel" inputMode="tel" autoComplete="tel" className={inputClass} value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
                </div>

                <div className="sm:col-span-2">
                  <span className={labelClass}>
                    {t('acollida_form.member_question', "Sou família sòcia de l'AFA?")} <span className="text-red-500">*</span>
                  </span>
                  <div className="flex gap-3">
                    {[true, false].map((value) => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() => setIsMember(value)}
                        className={`flex-1 px-4 py-3 rounded-xl border-2 font-semibold transition ${
                          isMember === value
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                        aria-pressed={isMember === value}
                      >
                        {value ? t('acollida_form.member_yes', 'Sí') : t('acollida_form.member_no', 'No')}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {t('acollida_form.member_hint', "Les famílies sòcies tenen tarifa reduïda. Els preus d'aquesta pàgina s'ajusten a la resposta.")}
                  </p>
                </div>
              </div>
            </section>

            {/* One block per child. */}
            {children.map((child, index) => {
              const rate = rateById.get(child.rateId);
              const monthly = rate && isMember !== null ? unitPrice(rate, isMember, 'mensual') : null;
              const dayPrice = rate && isMember !== null ? unitPrice(rate, isMember, 'ocasional') : null;
              const charge = rate && isMember !== null ? occasionalCharge(rate, isMember, child.dates.length) : null;
              const childFullDays = fullDays[child.rateId] || [];
              const freeWeekdays = availableWeekdays(childFullDays);
              const wantsWaitlist =
                child.modality === 'ocasional'
                  ? child.dates.some((d) => childFullDays.includes(d))
                  : child.weekdays.some((d) => !freeWeekdays.includes(d));

              return (
                <section key={index} className={card}>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      {children.length > 1
                        ? t('acollida_form.child_title_n', 'Infant {{n}}', { n: index + 1 })
                        : t('acollida_form.child_title', 'Dades de l\'infant')}
                    </h2>
                    {children.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setChildren((prev) => prev.filter((_, i) => i !== index))}
                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('acollida_form.remove_child', 'Treure')}
                      </button>
                    )}
                  </div>

                  {index > 0 && (
                    <p className="-mt-2 mb-5 text-xs text-slate-500 dark:text-slate-400">
                      {t('acollida_form.sibling_copied', "Hem copiat la franja i els dies de l'infant anterior. Canvia'ls si aquest infant els fa diferents.")}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass} htmlFor={`child_name_${index}`}>
                        {t('acollida_form.child_name', 'Nom')} <span className="text-red-500">*</span>
                      </label>
                      <input id={`child_name_${index}`} className={inputClass} value={child.name} onChange={(e) => updateChild(index, { name: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor={`child_surname_${index}`}>
                        {t('acollida_form.child_surname', 'Cognoms')} <span className="text-red-500">*</span>
                      </label>
                      <input id={`child_surname_${index}`} className={inputClass} value={child.surname} onChange={(e) => updateChild(index, { surname: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass} htmlFor={`child_course_${index}`}>
                        {t('acollida_form.course', 'Curs')} <span className="text-red-500">*</span>
                      </label>
                      <select id={`child_course_${index}`} className={inputClass} value={child.course} onChange={(e) => updateChild(index, { course: e.target.value })}>
                        <option value="">{t('acollida_form.course_placeholder', 'Tria el curs')}</option>
                        {COURSES.map((course) => (
                          <option key={course.code} value={course.code}>
                            {t(course.i18nKey, course.label)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Time slot: the price is part of the option, not a table the
                      family has to cross-check on another page. */}
                  <div className="mt-6">
                    <span className={labelClass}>
                      {t('acollida_form.slot', 'Franja horària')} <span className="text-red-500">*</span>
                    </span>

                    {loadingRates ? (
                      <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('common.loading', 'Carregant...')}
                      </div>
                    ) : rates.length === 0 ? (
                      <p className="text-sm text-slate-500 py-4">
                        {t('acollida_form.no_rates', "Ara mateix no hi ha franges publicades. Escriu-nos i ho mirem.")}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {rates.map((option) => {
                          const selected = child.rateId === option.id;
                          const month = isMember === null ? null : unitPrice(option, isMember, 'mensual');
                          const day = isMember === null ? null : unitPrice(option, isMember, 'ocasional');
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => updateChild(index, { rateId: option.id })}
                              aria-pressed={selected}
                              className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border-2 text-left transition ${
                                selected
                                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <span className="font-semibold text-slate-800 dark:text-slate-100">
                                {tContent(option, 'horari')}
                              </span>
                              <span className="text-right shrink-0">
                                {month != null && (
                                  <span className="block text-sm font-black text-indigo-700 dark:text-indigo-300">
                                    {formatEuro(month)} <span className="font-semibold text-slate-500">/{t('acollida_form.per_month', 'mes')}</span>
                                  </span>
                                )}
                                {day != null && (
                                  <span className="block text-xs text-slate-500">
                                    {formatEuro(day)} /{t('acollida_form.per_day', 'dia')}
                                  </span>
                                )}
                                {isMember === null && (
                                  <span className="block text-xs text-slate-400">
                                    {t('acollida_form.answer_member_first', 'Respon la pregunta de soci per veure el preu')}
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Modality, and only the question that its answer needs. */}
                  <div className="mt-6">
                    <span className={labelClass}>{t('acollida_form.modality', 'Com el fareu servir?')}</span>
                    <div className="flex gap-3">
                      {(['mensual', 'ocasional'] as AcollidaModality[]).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateChild(index, { modality: value })}
                          aria-pressed={child.modality === value}
                          className={`flex-1 px-4 py-3 rounded-xl border-2 font-semibold transition ${
                            child.modality === value
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {value === 'mensual'
                            ? t('acollida_form.modality_monthly', 'Cada mes')
                            : t('acollida_form.modality_occasional', 'Dies solts')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {child.modality === 'mensual' ? (
                    <div className="mt-5">
                      <span className={labelClass}>{t('acollida_form.weekdays', 'Quins dies?')}</span>
                      <div className="flex flex-wrap gap-2">
                        {ACOLLIDA_WEEKDAYS.map((day) => {
                          const checked = child.weekdays.includes(day);
                          const isFull = child.rateId !== '' && !freeWeekdays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleWeekday(index, day)}
                              aria-pressed={checked}
                              title={isFull ? t('acollida_form.weekday_full', "Complet: entrareu a la llista d'espera") : undefined}
                              className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition ${
                                checked && isFull
                                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                  : checked
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                    : isFull
                                      ? 'border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                              }`}
                            >
                              {t(WEEKDAY_I18N_KEYS[day])}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5">
                      <span className={labelClass}>{t('acollida_form.dates', 'Quins dies concrets?')}</span>
                      <OccasionalDatesPicker
                        value={child.dates}
                        onChange={(dates) => updateChild(index, { dates })}
                        fullDates={childFullDays}
                        onFullDayTapped={(iso) => updateChild(index, { dates: [...child.dates, iso].sort() })}
                        onMonthChange={(year, month) => loadFullDays(child.rateId, year, month)}
                      />
                      {charge != null && child.dates.length > 0 && (
                        <div className="mt-3 text-sm">
                          {charge.capped ? (
                            <p className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 px-4 py-3 text-green-800 dark:text-green-300">
                              {t('acollida_form.occasional_capped', 'Amb {{count}} dies ja superareu la quota del mes, així que us cobrem el mes sencer: {{amount}}.', {
                                count: child.dates.length,
                                amount: formatEuro(charge.amount),
                              })}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-500">
                              {t('acollida_form.occasional_total', '{{count}} dies × {{price}}', {
                                count: child.dates.length,
                                price: formatEuro(dayPrice),
                              })}{' '}
                              = <strong>{formatEuro(charge.amount)}</strong>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {wantsWaitlist && (
                    <p className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        {t('acollida_form.waitlist_notice', "Algun dels dies que heu triat ja té les places plenes. Podeu enviar la sol·licitud igualment: quedareu a la llista d'espera i us avisarem a la primera baixa.")}
                      </span>
                    </p>
                  )}

                  {monthly != null && child.modality === 'mensual' && (
                    <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
                      <CalendarDays className="inline w-4 h-4 mr-1.5 -mt-0.5 text-indigo-500" />
                      {t('acollida_form.child_monthly', 'Aquest infant: {{amount}} al mes', { amount: formatEuro(monthly) })}
                    </p>
                  )}
                </section>
              );
            })}

            {children.length < MAX_CHILDREN && (
              <button
                type="button"
                onClick={() => setChildren((prev) => [...prev, siblingDraft(prev[prev.length - 1], rates)])}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold hover:border-indigo-400 hover:text-indigo-600 transition"
              >
                <Plus className="w-5 h-5" />
                {t('acollida_form.add_child', 'Afegir un altre infant')}
              </button>
            )}

            <section className={card}>
              <label className={labelClass} htmlFor="acollida_notes">
                {t('acollida_form.notes', 'Alguna cosa que hàgim de saber?')}
              </label>
              <textarea
                id="acollida_notes"
                rows={3}
                className={inputClass}
                placeholder={t('acollida_form.notes_placeholder', "Al·lèrgies, qui recull l'infant, germans que van junts...")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <label className="flex items-start gap-3 mt-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {t('acollida_form.consent', "Autoritzo el tractament d'aquestes dades per gestionar el servei d'acollida.")}{' '}
                  <Link to="/privacitat" className="text-indigo-600 dark:text-indigo-400 underline">
                    {t('acollida_form.privacy_link', 'Política de privacitat')}
                  </Link>
                </span>
              </label>
            </section>

            {summary && summary.total > 0 && (
              <div className="sticky bottom-4 bg-slate-900 text-white rounded-2xl px-5 py-4 flex items-center justify-between gap-4 shadow-xl">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">
                    {t('acollida_form.summary_label', 'Total estimat')}
                  </p>
                  <p className="text-xl font-black">
                    {formatEuro(summary.total)}
                    <span className="text-sm font-semibold text-white/70"> /{t('acollida_form.per_month', 'mes')}</span>
                  </p>
                </div>
                <p className="text-xs text-white/60 max-w-[50%] text-right">
                  {t('acollida_form.summary_hint', "L'AFA confirma la plaça i l'import abans de cobrar res.")}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-6 py-4 rounded-2xl font-bold text-lg transition-colors shadow-lg shadow-indigo-500/30"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardList className="w-5 h-5" />}
              {t('acollida_form.submit', 'Enviar la sol·licitud')}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
