import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, AlertCircle, Rocket, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';



interface Student {
  name: string;
  surname: string;
  course: string;
  activities: string[];
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
  healthInfo: string;
  imageRights: string; // "si" | "no"
  canLeaveAlone: string; // "true" | "false"
  termsAccepted: boolean;
}

export default function InscriptionPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

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

  const ALL_ACTIVITIES = useMemo(() => ({
    infantil: [
      { value: "Teatre Musical en Anglès (Dimarts)", label: `${t('inscription.activity_names.musical_theater_eng')} - ${t('inscription.days.tue')} 16:30-18:00` },
      { value: "Marxa-Marxa en Anglès (Dijous)", label: `${t('inscription.activity_names.marxa_marxa_eng')} - ${t('inscription.days.thu')} 16:30-18:00` },
      { value: "Iniciació a Timbals (Divendres)", label: `${t('inscription.activity_names.drums_init')} - ${t('inscription.days.fri')} 17:30-19:00` },
    ],
    primaria1: [
      { value: "Futbol (Dimarts)", label: `${t('inscription.activity_names.football')} - ${t('inscription.days.tue')} 16:30-18:00` },
      { value: "Anglès (Dimecres)", label: `${t('inscription.activity_names.english')} - ${t('inscription.days.wed')} 16:30-18:00` },
      { value: "Patinatge (Dimecres)", label: `${t('inscription.activity_names.skating')} - ${t('inscription.days.wed')} 16:30-18:00` },
      { value: "Futbol (Dijous)", label: `${t('inscription.activity_names.football')} - ${t('inscription.days.thu')} 16:30-18:00` },
      { value: "Timbals (Divendres)", label: `${t('inscription.activity_names.drums')} - ${t('inscription.days.fri')} 17:30-19:00` },
    ],
    primaria2: [
      { value: "Anglès (Dimarts)", label: `${t('inscription.activity_names.english')} - ${t('inscription.days.tue')} 16:30-18:00` },
      { value: "Futbol (Dimarts)", label: `${t('inscription.activity_names.football')} - ${t('inscription.days.tue')} 16:30-18:00` },
      { value: "Patinatge (Dimecres)", label: `${t('inscription.activity_names.skating')} - ${t('inscription.days.wed')} 16:30-18:00` },
      { value: "Futbol (Dijous)", label: `${t('inscription.activity_names.football')} - ${t('inscription.days.thu')} 16:30-18:00` },
      { value: "Timbals (Divendres)", label: `${t('inscription.activity_names.drums')} - ${t('inscription.days.fri')} 17:30-19:00` },
    ]
  }), [t]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [students, setStudents] = useState<Student[]>([
    { name: '', surname: '', course: '', activities: [] }
  ]);
  
  const [parentInfo, setParentInfo] = useState<ParentInfo>({
    name: '', dni: '', phone1: '', phone2: '', email1: '', email2: '', isAfaMember: ''
  });

  const [additionalInfo, setAdditionalInfo] = useState<AdditionalInfo>({
    healthInfo: '', imageRights: '', canLeaveAlone: '', termsAccepted: false
  });

  // Handlers
  const addStudent = () => {
    if (students.length < 3) {
      setStudents([...students, { name: '', surname: '', course: '', activities: [] }]);
    }
  };

  const removeStudent = (index: number) => {
    const newStudents = [...students];
    newStudents.splice(index, 1);
    setStudents(newStudents);
  };

  const updateStudent = (index: number, field: keyof Student, value: any) => {
    const newStudents = [...students];
    // @ts-ignore
    newStudents[index] = { ...newStudents[index], [field]: value };
    
    if (field === 'course') {
      newStudents[index].activities = [];
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
    // @ts-ignore
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
            activities: s.activities
        })),
        health_info: additionalInfo.healthInfo || null,
        image_auth_consent: additionalInfo.imageRights,
        can_leave_alone: additionalInfo.canLeaveAlone === 'true',
        conditions_accepted: true,
        form_language: i18n.language,
        status: 'alta' 
      };

      const { error: insertError } = await supabase
        .from('inscripcions')
        .insert([payload]);

      if (insertError) throw insertError;

      setSubmitted(true);
      window.scrollTo(0, 0);

    } catch (err: any) {
      console.error(err);
      setError(err.message || t('inscription.form.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 shadow-sm">
            <div className="rounded-full bg-green-100 p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">{t('inscription.form.success_title')}</h2>
            <p className="text-green-700 mb-6">
                {t('inscription.form.success_message')}
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
            {t('inscription.title_prefix')} <br className="hidden md:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                {t('inscription.title_highlight')}
            </span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {t('inscription.subtitle_prefix')} <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">{t('inscription.subtitle_highlight')}</span> {t('inscription.subtitle_suffix')}
        </p>
      </div>

      <div className="bg-white border border-slate-200 p-6 mb-10 rounded-2xl flex gap-5 items-start shadow-sm ring-1 ring-slate-100">
        <div className="bg-blue-100 p-2 rounded-lg shrink-0">
            <Info className="w-6 h-6 text-blue-600" />
        </div>
        <div>
           <h3 className="font-bold text-slate-900 text-lg mb-1">{t('inscription.info_box.title')}</h3>
           <p className="text-slate-600 leading-relaxed">
             {t('inscription.info_box.text')}
           </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* --- Students Section --- */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold border-b pb-2">{t('inscription.form.student_section')}</h2>
          
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
                </div>
              </div>
            );
          })}
          
          {students.length < 3 && (
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
            <h2 className="text-xl font-semibold border-b pb-2">{t('inscription.form.parent_section')}</h2>
            <div className="bg-white border rounded-lg shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">{t('inscription.form.name')} <span className="text-red-500">*</span></label>
                        <input className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.name} onChange={e => setParentInfo({...parentInfo, name: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">{t('inscription.form.dni')} <span className="text-red-500">*</span></label>
                        <input className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.dni} onChange={e => setParentInfo({...parentInfo, dni: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">{t('inscription.form.phone_1')} <span className="text-red-500">*</span></label>
                        <input type="tel" className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.phone1} onChange={e => setParentInfo({...parentInfo, phone1: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">{t('inscription.form.phone_2')}</label>
                        <input type="tel" className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.phone2} onChange={e => setParentInfo({...parentInfo, phone2: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">{t('inscription.form.email_1')} <span className="text-red-500">*</span></label>
                        <input type="email" className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.email1} onChange={e => setParentInfo({...parentInfo, email1: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">{t('inscription.form.email_2')}</label>
                        <input type="email" className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.email2} onChange={e => setParentInfo({...parentInfo, email2: e.target.value})} />
                    </div>
                    <div className="md:col-span-2 space-y-3">
                        <label className="block text-sm font-medium text-gray-700">{t('inscription.form.is_member')} <span className="text-red-500">*</span></label>
                        <div className="flex space-x-6">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" name="afa_member" value="true" checked={parentInfo.isAfaMember === 'true'} onChange={() => setParentInfo({...parentInfo, isAfaMember: 'true'})} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                                <span>{t('inscription.form.yes')}</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" name="afa_member" value="false" checked={parentInfo.isAfaMember === 'false'} onChange={() => setParentInfo({...parentInfo, isAfaMember: 'false'})} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                                <span>{t('inscription.form.no')}</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* --- Additional Info Section --- */}
        <section className="space-y-6">
            <h2 className="text-xl font-semibold border-b pb-2">{t('inscription.form.additional_section')}</h2>
            <div className="bg-white border rounded-lg shadow-sm p-6 space-y-6">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">{t('inscription.form.health_info')}</label>
                    <input 
                        className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        value={additionalInfo.healthInfo} 
                        onChange={e => setAdditionalInfo({...additionalInfo, healthInfo: e.target.value})} 
                        placeholder={t('inscription.form.health_placeholder')} 
                    />
                </div>
                
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">{t('inscription.form.image_rights')} <span className="text-red-500">*</span></label>
                    <p className="text-xs text-gray-500">
                         {t('inscription.form.image_text')}
                    </p>
                    <div className="flex flex-col space-y-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="img_rights" value="si" checked={additionalInfo.imageRights === 'si'} onChange={() => setAdditionalInfo({...additionalInfo, imageRights: 'si'})} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                            <span>{t('inscription.form.image_yes')}</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="img_rights" value="no" checked={additionalInfo.imageRights === 'no'} onChange={() => setAdditionalInfo({...additionalInfo, imageRights: 'no'})} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                            <span>{t('inscription.form.image_no')}</span>
                        </label>
                    </div>
                </div>

                <div className="space-y-3">
                     <label className="block text-sm font-medium text-gray-700">{t('inscription.form.leave_alone')} <span className="text-red-500">*</span></label>
                     <p className="text-xs text-gray-500">{t('inscription.form.leave_alone_text')}</p>
                     <div className="flex space-x-6">
                         <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="leave_alone" value="true" checked={additionalInfo.canLeaveAlone === 'true'} onChange={() => setAdditionalInfo({...additionalInfo, canLeaveAlone: 'true'})} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                            <span>{t('inscription.form.yes')}</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="leave_alone" value="false" checked={additionalInfo.canLeaveAlone === 'false'} onChange={() => setAdditionalInfo({...additionalInfo, canLeaveAlone: 'false'})} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                            <span>{t('inscription.form.no')}</span>
                        </label>
                    </div>
                </div>

                <div className="pt-4 border-t">
                    <div className="flex items-center space-x-2">
                        <input 
                            type="checkbox"
                            id="terms" 
                            checked={additionalInfo.termsAccepted} 
                            onChange={(e) => setAdditionalInfo({...additionalInfo, termsAccepted: e.target.checked})}
                             className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer select-none">
                            {t('inscription.form.terms_accept')} <a href="#" className="text-blue-600 underline hover:text-blue-800">{t('inscription.form.terms_link')}</a>. <span className="text-red-500">*</span>
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
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : t('inscription.form.submit_btn')}
            </button>
            <p className="text-center text-xs text-gray-500 mt-4">
                {t('inscription.form.privacy_note')}
            </p>
        </div>

      </form>
    </div>
  );
}
