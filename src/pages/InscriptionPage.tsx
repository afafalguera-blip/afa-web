import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, AlertCircle, Rocket, Info, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ConfigService, type FeesConfig, type PricingConfig, type SeasonConfig, type InscriptionFormConfig, type OptionalFieldKey, type OptionalFieldConfig, type Lang } from '../services/ConfigService';
import { useHomepageConfig } from '../hooks/useHomepageConfig';
import { ActivityService, type Activity } from '../services/ActivityService';
import { classifyGroup } from '../utils/courseStage';
import { makeContentResolver, pickLang } from '../utils/inscriptionContent';



interface Student {
  name: string;
  surname: string;
  course: string;
  activities: string[];
  healthInfo: string;
  imageRights: string;    // "si" | "no"
  canLeaveAlone: string;  // "true" | "false"
}

interface ParentInfo {
  name: string;
  dni: string;
  phone1: string;
  phone2: string;
  email1: string;
  email2: string;
  isAfaMember: string; // "true" | "false"
}

interface AdditionalInfo {
  authorizedPickup: string;
  termsAccepted: boolean;
}

const emptyStudent = (): Student => ({
  name: '', surname: '', course: '', activities: [],
  healthInfo: '', imageRights: 'si', canLeaveAlone: 'false',
});

export default function InscriptionPage() {
  // i18next types t() to literal keys only; this page resolves keys dynamically
  // and passes t to resolvers typed as (key, fallback) => string.
  const { t: tStrict, i18n } = useTranslation();
  const t = tStrict as unknown as (key: string, fallback?: string) => string;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const homepageConfig = useHomepageConfig();
  const [fees, setFees] = useState<FeesConfig | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [dbActivities, setDbActivities] = useState<Activity[]>([]);
  const [season, setSeason] = useState<SeasonConfig | null>(null);
  const [formCfg, setFormCfg] = useState<InscriptionFormConfig | null>(null);
  const [extraAnswers, setExtraAnswers] = useState<Record<string, string>>({});
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      ConfigService.getFeesConfig(),
      ConfigService.getPricingConfig(),
      ActivityService.getForInscription(),
      ConfigService.getSeasonConfig(),
      ConfigService.getInscriptionFormConfig(),
    ]).then(([f, p, acts, s, fc]) => {
      setFees(f);
      setPricing(p);
      setDbActivities(acts);
      setSeason(s);
      setFormCfg(fc);
      setConfigLoaded(true);
    }).catch((err) => {
      // Transient gateway failure (e.g. Cloudflare 522) even after retries:
      // surface it instead of silently showing a form with no activities.
      console.error('Error loading inscription config:', err);
      setError(t('inscription.form.load_error'));
      setConfigLoaded(true);
    });
  }, [t]);

  // Inscriptions are open by default unless admin has explicitly closed them
  // (or the season config row is missing on older databases).
  const inscriptionsOpen = season ? season.inscriptions_open : true;

  const iban = fees?.iban || 'ES22 0081 1604 7400 0103 8208';

  // Admin-editable content + fields (config-first, i18n fallback)
  const lang = i18n.language as Lang;
  const content = formCfg ? pickLang(formCfg.content, lang) : undefined;
  const c = makeContentResolver(content, t);

  const fieldCfg = useMemo(() => {
    const m: Partial<Record<OptionalFieldKey, OptionalFieldConfig>> = {};
    (formCfg?.fields ?? []).forEach(f => { m[f.key] = f; });
    return m;
  }, [formCfg]);
  const isFieldOn = (k: OptionalFieldKey) => (fieldCfg[k] ? fieldCfg[k]!.enabled : true);
  const isFieldReq = (k: OptionalFieldKey) => !!fieldCfg[k]?.required;
  const fieldLabel = (k: OptionalFieldKey, i18nKey: string) => {
    const l = fieldCfg[k]?.label?.[lang];
    return l && l.trim() ? l : t(i18nKey);
  };
  const customQuestions = (formCfg?.customQuestions ?? []).filter(q => q.enabled);

  const COURSES = useMemo(() => [
    { value: 'I3', label: t('inscription.courses.i3'), type: 'infantil' },
    { value: 'I4', label: t('inscription.courses.i4'), type: 'infantil' },
    { value: 'I5', label: t('inscription.courses.i5'), type: 'infantil' },
    { value: '1PRI', label: t('inscription.courses.1pri'), type: 'primaria1' },
    { value: '2PRI', label: t('inscription.courses.2pri'), type: 'primaria1' },
    { value: '3PRI', label: t('inscription.courses.3pri'), type: 'primaria1' },
    { value: '4PRI', label: t('inscription.courses.4pri'), type: 'primaria2' },
    { value: '5PRI', label: t('inscription.courses.5pri'), type: 'primaria2' },
    { value: '6PRI', label: t('inscription.courses.6pri'), type: 'primaria2' },
  ], [t]);

  const DAY_KEYS = ['', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  // Build activity options from DB: each schedule group is offered only to its own
  // course stage (infantil / primaria1 / primaria2), classified from the group label.
  const ALL_ACTIVITIES = useMemo(() => {
    const grouped: Record<string, { value: string; label: string; day: number }[]> = {};
    const lang = i18n.language as 'ca' | 'es' | 'en';

    for (const act of dbActivities) {
      const titleKey = `title_${lang}` as keyof Activity;
      const title = (act[titleKey] as string) || act.title;
      const scheduleDetails = act.schedule_details || [];

      for (const detail of scheduleDetails) {
        const stage = classifyGroup(detail.group);
        if (!stage) continue;
        if (!grouped[stage]) grouped[stage] = [];

        const sessions = detail.sessions || [];
        // Earliest weekday of this group's sessions, used to sort options Mon→Sun.
        const day = sessions.length ? Math.min(...sessions.map(s => s.day)) : 99;
        const days = sessions
          .map(s => DAY_KEYS[s.day] ? t(`admin.editor.days.${DAY_KEYS[s.day]}`) : '')
          .filter(Boolean)
          .join(' / ');
        const value = `${act.title} (${detail.group})`;
        const label = days ? `${title} (${days})` : title;
        if (!grouped[stage].some(a => a.value === value)) {
          grouped[stage].push({ value, label, day });
        }
      }
    }
    // Sort each stage's options by weekday, then alphabetically.
    for (const stage of Object.keys(grouped)) {
      grouped[stage].sort((a, b) => a.day - b.day || a.label.localeCompare(b.label));
    }
    return grouped;
  }, [dbActivities, i18n.language, t]);

  // Activity the user came from (ActivityDetailPage "sign up" button adds ?activity=<id>).
  // Used to auto-check it once a matching course is picked.
  const preselectActivity = useMemo(() => {
    const pid = Number(searchParams.get('activity'));
    return pid ? dbActivities.find(a => a.id === pid) ?? null : null;
  }, [searchParams, dbActivities]);
  const preselectTitle = preselectActivity
    ? ((preselectActivity[`title_${lang}` as keyof Activity] as string) || preselectActivity.title)
    : '';

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [students, setStudents] = useState<Student[]>([emptyStudent()]);

  const [parentInfo, setParentInfo] = useState<ParentInfo>({
    name: '', dni: '', phone1: '', phone2: '', email1: '', email2: '', isAfaMember: ''
  });

  const [additionalInfo, setAdditionalInfo] = useState<AdditionalInfo>({
    authorizedPickup: '', termsAccepted: false
  });

  // Handlers
  const addStudent = () => {
    if (students.length < homepageConfig.max_students_per_inscription) {
      setStudents([...students, emptyStudent()]);
    }
  };

  const removeStudent = (index: number) => {
    const newStudents = [...students];
    newStudents.splice(index, 1);
    setStudents(newStudents);
  };

  const updateStudent = (index: number, field: keyof Student, value: string | string[]) => {
    const newStudents = [...students];
    newStudents[index] = { ...newStudents[index], [field]: value };

    if (field === 'course') {
      newStudents[index].activities = [];
      // If the user arrived from an activity page, auto-check it for the chosen
      // course (only when that activity is actually offered to this stage).
      if (preselectActivity) {
        const stage = COURSES.find(c => c.value === value)?.type;
        const detail = (preselectActivity.schedule_details || []).find(d => classifyGroup(d.group) === stage);
        if (detail) newStudents[index].activities = [`${preselectActivity.title} (${detail.group})`];
      }
    }
    setStudents(newStudents);
  };

  const toggleActivity = (studentIndex: number, activityValue: string) => {
    const newStudents = [...students];
    const activities = newStudents[studentIndex].activities;
    if (activities.includes(activityValue)) {
      newStudents[studentIndex].activities = activities.filter(a => a !== activityValue);
    } else {
      newStudents[studentIndex].activities = [...activities, activityValue];
    }
    setStudents(newStudents);
  };

  const getAvailableActivities = (courseCode: string) => {
    const course = COURSES.find(c => c.value === courseCode);
    if (!course) return [];
    return ALL_ACTIVITIES[course.type] || [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!additionalInfo.termsAccepted) {
      setError(t('inscription.form.error_terms'));
      setLoading(false);
      return;
    }

    if (students.some(s => s.activities.length === 0)) {
      setError(t('inscription.form.error_activities'));
      setLoading(false);
      return;
    }

    // Required enabled optional field: DNI (others are free-text/optional or radios)
    if (isFieldOn('parent_dni') && isFieldReq('parent_dni') && !parentInfo.dni.trim()) {
      setError(fieldLabel('parent_dni', 'inscription.form.dni'));
      setLoading(false);
      return;
    }

    // Per-child health info, when enabled and required
    if (isFieldOn('health_info') && isFieldReq('health_info') && students.some(s => !s.healthInfo.trim())) {
      setError(fieldLabel('health_info', 'inscription.form.health_info'));
      setLoading(false);
      return;
    }

    // Required custom questions
    const missingCustom = customQuestions.find(q => q.required && !(extraAnswers[q.key] || '').trim());
    if (missingCustom) {
      setError(missingCustom.label[lang] || missingCustom.key);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        parent_name: parentInfo.name,
        parent_dni: parentInfo.dni,
        parent_phone_1: parentInfo.phone1,
        parent_phone_2: parentInfo.phone2 || null,
        parent_email_1: parentInfo.email1,
        parent_email_2: parentInfo.email2 || null,
        afa_member: parentInfo.isAfaMember === 'true',
        students: students.map(s => ({
          name: s.name,
          surname: s.surname,
          course: s.course,
          activities: s.activities,
          health_info: isFieldOn('health_info') ? (s.healthInfo || null) : null,
          image_auth_consent: isFieldOn('image_rights') ? s.imageRights : null,
          can_leave_alone: isFieldOn('leave_alone') ? s.canLeaveAlone === 'true' : null,
        })),
        authorized_pickup: additionalInfo.authorizedPickup || null,
        conditions_accepted: true,
        extra_answers: extraAnswers,
        form_language: i18n.language,
        status: 'alta'
      };

      const { error: insertError } = await supabase
        .from('inscripcions')
        .insert([payload]);

      if (insertError) throw insertError;

      setSubmitted(true);
      window.scrollTo(0, 0);

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || t('inscription.form.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  if (configLoaded && !inscriptionsOpen) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 shadow-sm">
          <div className="rounded-full bg-amber-100 p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Info className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-amber-900 mb-2">{t('inscription.closed.title')}</h2>
          <p className="text-amber-800 mb-6 leading-relaxed">{t('inscription.closed.message')}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
          >
            {t('inscription.form.back_home')}
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 shadow-sm">
          <div className="rounded-full bg-green-100 p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">{c('success_title', 'inscription.form.success_title')}</h2>
          <p className="text-green-700 mb-6">
            {c('success_message', 'inscription.form.success_message')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
          >
            {t('inscription.form.back_home')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center p-3 rounded-full bg-blue-100/50 text-blue-600 mb-6 ring-4 ring-blue-50"
        >
          <Rocket className="w-8 h-8" />
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
          {c('title_prefix', 'inscription.title_prefix')} <br className="hidden md:block" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            {c('title_highlight', 'inscription.title_highlight')}
          </span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {c('subtitle_prefix', 'inscription.subtitle_prefix')} <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">{c('subtitle_highlight', 'inscription.subtitle_highlight')}</span> {c('subtitle_suffix', 'inscription.subtitle_suffix')}
        </p>
      </div>

      <div className="bg-white border border-slate-200 p-6 mb-10 rounded-2xl flex gap-5 items-start shadow-sm ring-1 ring-slate-100">
        <div className="bg-blue-100 p-2 rounded-lg shrink-0">
          <Info className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-lg mb-1">{c('info_box_title', 'inscription.info_box.title')}</h3>
          <p className="text-slate-600 leading-relaxed whitespace-pre-line">
            {c('info_box_text', 'inscription.info_box.text')}
          </p>
        </div>
      </div>

      {/* --- Pricing & Payment Section --- */}
      <section className="mb-10 space-y-6">
        <h2 className="text-xl font-bold bg-slate-100 px-4 py-2 rounded-lg border-l-4 border-blue-500 text-slate-800">
          {c('pricing_title', 'inscription.pricing.title')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(pricing?.tiers || []).map((tier, idx) => {
            const label = tier.label[lang] || tier.label.ca;
            const note = tier.note?.[lang] || tier.note?.ca;
            const memberLabel = tier.member_price_label?.[lang] || tier.member_price_label?.ca || t('inscription.pricing.socis');
            const nonMemberLabel = tier.non_member_price_label?.[lang] || tier.non_member_price_label?.ca || t('inscription.pricing.no_socis');
            const isHighlighted = idx > 0;
            return (
              <div key={tier.id} className={`${isHighlighted ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-200'} border p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden`}>
                {isHighlighted && <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">INFO</div>}
                <h4 className={`font-bold mb-1 ${isHighlighted ? 'text-indigo-900' : 'text-slate-900'}`}>{label}</h4>
                <p className={`text-xs mb-3 ${isHighlighted ? 'text-indigo-500' : 'text-slate-500'}`}>{tier.schedule}</p>
                <div className="space-y-1">
                  <p><span className={`font-bold ${isHighlighted ? 'text-indigo-600' : 'text-blue-600'}`}>{tier.member_price}€</span> <span className={`text-sm ${isHighlighted ? 'text-indigo-700' : 'text-slate-600'}`}>{memberLabel}</span></p>
                  <p><span className={`font-bold ${isHighlighted ? 'text-indigo-400' : 'text-slate-400'}`}>{tier.non_member_price}€</span> <span className={`text-sm ${isHighlighted ? 'text-indigo-700' : 'text-slate-600'}`}>{nonMemberLabel}</span></p>
                </div>
                {note && (
                  <div className="mt-3 text-[10px] bg-indigo-100/50 p-2 rounded border border-indigo-200 text-indigo-700">
                    {note}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
          <p><strong>{t('inscription.pricing.discount_title')}</strong> {t('inscription.pricing.discount_body')}</p>
        </div>

        <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-4 items-start shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-red-800 mb-1">{c('english_warning_title', 'inscription.pricing.english_warning_title')}</p>
            <p className="text-red-700 leading-relaxed italic whitespace-pre-line">{c('english_warning_body', 'inscription.pricing.english_warning_body')}</p>
          </div>
        </div>

        {/* Payment Info Box */}
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl shadow-sm">
          <h4 className="font-bold text-emerald-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            {c('payment_method_title', 'inscription.pricing.payment_method_title')}
          </h4>
          <p className="text-sm text-emerald-800 mb-4 whitespace-pre-line">{c('payment_method_body', 'inscription.pricing.payment_method_body')}</p>

          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-emerald-200/50">
            <code className="text-sm font-mono text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg flex-grow block w-full text-center sm:text-left">
              {iban}
            </code>
            <button
              onClick={(e) => {
                e.preventDefault();
                navigator.clipboard.writeText(iban);
                // Could add a toast here
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-colors shadow-sm shrink-0 w-full sm:w-auto"
            >
              {t('inscription.pricing.copy_iban')}
            </button>
          </div>
          <p className="text-[10px] text-emerald-600 font-bold mt-3 text-center sm:text-left uppercase tracking-tight">
            {c('iban_hint', 'inscription.pricing.iban_hint')}
          </p>
        </div>
      </section>

      {error && (
        <div className="bg-red-50 text-red-800 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* --- Students Section --- */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold border-b pb-2">{c('student_section', 'inscription.form.student_section')}</h2>

          {preselectActivity && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3 text-sm text-blue-900">
              <Info className="w-5 h-5 text-blue-600 shrink-0" />
              <span>{t('inscription.form.preselected_activity')} <strong>{preselectTitle}</strong>. {t('inscription.form.preselected_activity_hint')}</span>
            </div>
          )}

          {students.map((student, index) => {
            const activities = student.course ? getAvailableActivities(student.course) : [];
            return (
              <div key={index} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                  <h3 className="font-medium text-gray-700">{t('inscription.form.student_label')} {index + 1}</h3>
                  {index > 0 && <button type="button" className="text-red-500 hover:text-red-700 text-sm font-medium" onClick={() => removeStudent(index)}>{t('inscription.form.remove_student')}</button>}
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">{t('inscription.form.name')} <span className="text-red-500">*</span></label>
                      <input
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        value={student.name}
                        onChange={(e) => updateStudent(index, 'name', e.target.value)}
                        required
                        placeholder={t('inscription.form.name')}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">{t('inscription.form.surname')} <span className="text-red-500">*</span></label>
                      <input
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={student.surname}
                        onChange={(e) => updateStudent(index, 'surname', e.target.value)}
                        required
                        placeholder={t('inscription.form.surname')}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">{t('inscription.form.course')} <span className="text-red-500">*</span></label>
                      <select
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={student.course}
                        onChange={(e) => updateStudent(index, 'course', e.target.value)}
                        required
                      >
                        <option value="" disabled>{t('inscription.form.select_course')}</option>
                        {COURSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Activities Selection */}
                  {student.course && (
                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                      <h4 className="text-sm font-semibold text-blue-900 mb-3 uppercase tracking-wide">
                        {t('inscription.form.available_activities')} {COURSES.find(c => c.value === student.course)?.label}
                      </h4>
                      {preselectActivity && !activities.some(a => a.value.startsWith(preselectActivity.title + ' (')) && (
                        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2 mb-3">
                          <strong>{preselectTitle}</strong> {t('inscription.form.activity_not_for_course')}
                        </p>
                      )}
                      {activities.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('inscription.form.no_activities')}</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activities.map((act: { value: string; label: string }) => (
                            <div
                              key={act.value}
                              className={`
                                            flex items-start space-x-3 p-3 rounded-md border cursor-pointer transition-all
                                            ${student.activities.includes(act.value)
                                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                  : 'border-gray-200 bg-white hover:border-blue-300'
                                }
                                        `}
                              onClick={() => toggleActivity(index, act.value)}
                            >
                              <input
                                type="checkbox"
                                id={`act-${index}-${act.value}`}
                                checked={student.activities.includes(act.value)}
                                onChange={() => toggleActivity(index, act.value)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label
                                htmlFor={`act-${index}-${act.value}`}
                                className="text-sm font-medium leading-none cursor-pointer select-none"
                              >
                                {act.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                      {student.activities.length === 0 && <p className="text-xs text-red-500 mt-2">{t('inscription.form.must_select_activity')}</p>}
                    </div>
                  )}

                  {!student.course && (
                    <p className="text-sm text-gray-500 italic bg-slate-50 border border-dashed border-slate-300 rounded-lg p-3">
                      {t('inscription.form.select_course_first')}
                    </p>
                  )}

                  {/* Per-child additional info */}
                  {(isFieldOn('health_info') || isFieldOn('image_rights') || isFieldOn('leave_alone')) && (
                    <div className="space-y-5 pt-2 border-t border-slate-100">
                      {isFieldOn('health_info') && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">{fieldLabel('health_info', 'inscription.form.health_info')} {isFieldReq('health_info') && <span className="text-red-500">*</span>}</label>
                          <input
                            className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            value={student.healthInfo}
                            onChange={e => updateStudent(index, 'healthInfo', e.target.value)}
                            placeholder={t('inscription.form.health_placeholder')}
                            required={isFieldReq('health_info')}
                          />
                        </div>
                      )}

                      {isFieldOn('image_rights') && (
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-gray-700">{fieldLabel('image_rights', 'inscription.form.image_rights')} <span className="text-red-500">*</span></label>
                          <p className="text-xs text-gray-500">{t('inscription.form.image_text')}</p>
                          <div className="flex flex-col space-y-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input type="radio" name={`img_rights_${index}`} value="si" checked={student.imageRights === 'si'} onChange={() => updateStudent(index, 'imageRights', 'si')} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                              <span>{t('inscription.form.image_yes')}</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input type="radio" name={`img_rights_${index}`} value="no" checked={student.imageRights === 'no'} onChange={() => updateStudent(index, 'imageRights', 'no')} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                              <span>{t('inscription.form.image_no')}</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {isFieldOn('leave_alone') && (
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-gray-700">{fieldLabel('leave_alone', 'inscription.form.leave_alone')} <span className="text-red-500">*</span></label>
                          <p className="text-xs text-gray-500">{t('inscription.form.leave_alone_text')}</p>
                          <div className="flex space-x-6">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input type="radio" name={`leave_alone_${index}`} value="true" checked={student.canLeaveAlone === 'true'} onChange={() => updateStudent(index, 'canLeaveAlone', 'true')} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                              <span>{t('inscription.form.yes')}</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input type="radio" name={`leave_alone_${index}`} value="false" checked={student.canLeaveAlone === 'false'} onChange={() => updateStudent(index, 'canLeaveAlone', 'false')} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                              <span>{t('inscription.form.no')}</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {students.length < homepageConfig.max_students_per_inscription && (
            <button
              type="button"
              onClick={addStudent}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
            >
              {t('inscription.form.add_student')}
            </button>
          )}
        </section>

        {/* --- Parent Section --- */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold border-b pb-2">{c('parent_section', 'inscription.form.parent_section')}</h2>
          <div className="bg-white border rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t('inscription.form.name')} <span className="text-red-500">*</span></label>
                <input className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.name} onChange={e => setParentInfo({ ...parentInfo, name: e.target.value })} required />
              </div>
              {isFieldOn('parent_dni') && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{fieldLabel('parent_dni', 'inscription.form.dni')} {isFieldReq('parent_dni') && <span className="text-red-500">*</span>}</label>
                  <input className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.dni} onChange={e => setParentInfo({ ...parentInfo, dni: e.target.value })} required={isFieldReq('parent_dni')} />
                </div>
              )}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t('inscription.form.phone_1')} <span className="text-red-500">*</span></label>
                <input type="tel" className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.phone1} onChange={e => setParentInfo({ ...parentInfo, phone1: e.target.value })} required />
              </div>
              {isFieldOn('parent_phone_2') && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{fieldLabel('parent_phone_2', 'inscription.form.phone_2')} {isFieldReq('parent_phone_2') && <span className="text-red-500">*</span>}</label>
                  <input type="tel" className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.phone2} onChange={e => setParentInfo({ ...parentInfo, phone2: e.target.value })} required={isFieldReq('parent_phone_2')} />
                </div>
              )}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t('inscription.form.email_1')} <span className="text-red-500">*</span></label>
                <input type="email" className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.email1} onChange={e => setParentInfo({ ...parentInfo, email1: e.target.value })} required />
              </div>
              {isFieldOn('parent_email_2') && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{fieldLabel('parent_email_2', 'inscription.form.email_2')} {isFieldReq('parent_email_2') && <span className="text-red-500">*</span>}</label>
                  <input type="email" className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.email2} onChange={e => setParentInfo({ ...parentInfo, email2: e.target.value })} required={isFieldReq('parent_email_2')} />
                </div>
              )}
              <div className="md:col-span-2 space-y-3">
                <label className="block text-sm font-medium text-gray-700">{t('inscription.form.is_member')} <span className="text-red-500">*</span></label>
                <div className="flex space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="afa_member" value="true" checked={parentInfo.isAfaMember === 'true'} onChange={() => setParentInfo({ ...parentInfo, isAfaMember: 'true' })} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                    <span>{t('inscription.form.yes')}</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="afa_member" value="false" checked={parentInfo.isAfaMember === 'false'} onChange={() => setParentInfo({ ...parentInfo, isAfaMember: 'false' })} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                    <span>{t('inscription.form.no')}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- Additional Info Section --- */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold border-b pb-2">{c('additional_section', 'inscription.form.additional_section')}</h2>
          <div className="bg-white border rounded-lg shadow-sm p-6 space-y-6">
            {/* Salud, derechos de imagen y "puede irse solo" ahora son por alumno
                (dentro de cada bloque de alumno). Aquí queda lo común a la familia. */}
            {isFieldOn('leave_alone') && students.some(s => s.canLeaveAlone === 'false') && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t('inscription.form.authorized_pickup')}</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder={t('inscription.form.authorized_pickup_placeholder')}
                  value={additionalInfo.authorizedPickup}
                  onChange={e => setAdditionalInfo({ ...additionalInfo, authorizedPickup: e.target.value })}
                />
              </div>
            )}

            {/* Admin-defined custom questions */}
            {customQuestions.map(q => {
              const qLabel = q.label[lang] || q.key;
              const qPlaceholder = q.placeholder?.[lang] || '';
              const val = extraAnswers[q.key] || '';
              const setVal = (v: string) => setExtraAnswers(prev => ({ ...prev, [q.key]: v }));
              return (
                <div key={q.key} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{qLabel} {q.required && <span className="text-red-500">*</span>}</label>
                  {q.type === 'long_text' ? (
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      value={val} placeholder={qPlaceholder} required={q.required}
                      onChange={e => setVal(e.target.value)}
                    />
                  ) : q.type === 'select' ? (
                    <select
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      value={val} required={q.required}
                      onChange={e => setVal(e.target.value)}
                    >
                      <option value="" disabled>{t('inscription.form.select_course')}</option>
                      {(q.options || []).map((opt, i) => (
                        <option key={i} value={opt.es || opt[lang]}>{opt[lang] || opt.es}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      value={val} placeholder={qPlaceholder} required={q.required}
                      onChange={e => setVal(e.target.value)}
                    />
                  )}
                </div>
              );
            })}

            <div className="pt-4 border-t">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={additionalInfo.termsAccepted}
                  onChange={(e) => setAdditionalInfo({ ...additionalInfo, termsAccepted: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer select-none">
                  {c('terms_accept', 'inscription.form.terms_accept')} <a href={c('terms_url', '') || '#'} target={content?.terms_url ? '_blank' : undefined} rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">{c('terms_link', 'inscription.form.terms_link')}</a>. <span className="text-red-500">*</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <div className="pt-6">
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-4 rounded-lg shadow-md hover:shadow-lg transition-all flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : c('submit_btn', 'inscription.form.submit_btn')}
          </button>
          <p className="text-center text-xs text-gray-500 mt-4">
            {c('privacy_note', 'inscription.form.privacy_note')}
          </p>
        </div>

      </form>
    </div>
  );
}
