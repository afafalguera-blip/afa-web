import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

// --- Constants (Same as before) ---
const ALL_ACTIVITIES = {
  infantil: [
    { value: "Teatre Musical en Anglès (Dimarts)", label: "Teatre Musical en Anglès - Dimarts 16:30-18:00" },
    { value: "Marxa-Marxa en Anglès (Dijous)", label: "Marxa-Marxa en Anglès - Dijous 16:30-18:00" },
    { value: "Iniciació a Timbals (Divendres)", label: "Iniciació a Timbals - Divendres 17:30-19:00" },
  ],
  primaria1: [
    { value: "Futbol (Dimarts)", label: "Futbol - Dimarts 16:30-18:00" },
    { value: "Anglès (Dimecres)", label: "Anglès - Dimecres 16:30-18:00" },
    { value: "Patinatge (Dimecres)", label: "Patinatge - Dimecres 16:30-18:00" },
    { value: "Futbol (Dijous)", label: "Futbol - Dijous 16:30-18:00" },
    { value: "Timbals (Divendres)", label: "Timbals - Divendres 17:30-19:00" },
  ],
  primaria2: [
    { value: "Anglès (Dimarts)", label: "Anglès - Dimarts 16:30-18:00" },
    { value: "Futbol (Dimarts)", label: "Futbol - Dimarts 16:30-18:00" },
    { value: "Patinatge (Dimecres)", label: "Patinatge - Dimecres 16:30-18:00" },
    { value: "Futbol (Dijous)", label: "Futbol - Dijous 16:30-18:00" },
    { value: "Timbals (Divendres)", label: "Timbals - Divendres 17:30-19:00" },
  ]
};

const COURSES = [
  { value: 'I3', label: 'I3', type: 'infantil' },
  { value: 'I4', label: 'I4', type: 'infantil' },
  { value: 'I5', label: 'I5', type: 'infantil' },
  { value: '1PRI', label: '1r Primària', type: 'primaria1' },
  { value: '2PRI', label: '2n Primària', type: 'primaria1' },
  { value: '3PRI', label: '3r Primària', type: 'primaria1' },
  { value: '4PRI', label: '4t Primària', type: 'primaria2' },
  { value: '5PRI', label: '5è Primària', type: 'primaria2' },
  { value: '6PRI', label: '6è Primària', type: 'primaria2' },
];

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
  const navigate = useNavigate();
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
        setError("Has d'acceptar les condicions per continuar.");
        setLoading(false);
        return;
    }

    if (students.some(s => s.activities.length === 0)) {
        setError("Tots els alumnes han de tenir almenys una activitat seleccionada.");
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
        form_language: 'ca',
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
      setError(err.message || "Hi ha hagut un error en enviar el formulari.");
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
            <h2 className="text-2xl font-bold text-green-800 mb-2">Inscripció Rebuda!</h2>
            <p className="text-green-700 mb-6">
                Hem registrat correctament la preinscripció.
            </p>
            <button 
                onClick={() => navigate('/')} 
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
            >
                Tornar a l'inici
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-blue-900">Preinscripció Extraescolars 2025-26</h1>
        <p className="text-gray-600 mt-2">AFA Escola Falguera</p>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded-r-lg">
        <h3 className="font-semibold text-blue-800">Informació Important</h3>
        <p className="text-sm text-blue-700">
          Les activitats només es faran si hi ha prou alumnes. Si hi ha excés d'alumnes, es respectarà l'ordre d'inscripció.
        </p>
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
          <h2 className="text-xl font-semibold border-b pb-2">Dades dels Alumnes</h2>
          
          {students.map((student, index) => {
            const activities = student.course ? getAvailableActivities(student.course) : [];
            return (
              <div key={index} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                     <h3 className="font-medium text-gray-700">Alumne/a {index + 1}</h3>
                     {index > 0 && <button type="button" className="text-red-500 hover:text-red-700 text-sm font-medium" onClick={() => removeStudent(index)}>Eliminar</button>}
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Nom <span className="text-red-500">*</span></label>
                        <input 
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                            value={student.name} 
                            onChange={(e) => updateStudent(index, 'name', e.target.value)} 
                            required 
                            placeholder="Nom de l'alumne"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Cognoms <span className="text-red-500">*</span></label>
                        <input 
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={student.surname} 
                            onChange={(e) => updateStudent(index, 'surname', e.target.value)} 
                            required 
                            placeholder="Cognoms"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Curs <span className="text-red-500">*</span></label>
                        <select 
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={student.course} 
                            onChange={(e) => updateStudent(index, 'course', e.target.value)}
                            required
                        >
                            <option value="" disabled>Selecciona el curs</option>
                            {COURSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                  </div>

                  {/* Activities Selection */}
                  {student.course && (
                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                        <h4 className="text-sm font-semibold text-blue-900 mb-3 uppercase tracking-wide">
                            Activitats disponibles per a {COURSES.find(c => c.value === student.course)?.label}
                        </h4>
                        {activities.length === 0 ? (
                            <p className="text-sm text-gray-500">No hi ha activitats disponibles per a aquest curs.</p>
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
                        {student.activities.length === 0 && <p className="text-xs text-red-500 mt-2">* Has de seleccionar almenys una activitat.</p>}
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
                + Afegir un altre alumne/a
            </button>
          )}
        </section>

        {/* --- Parent Section --- */}
        <section className="space-y-6">
            <h2 className="text-xl font-semibold border-b pb-2">Dades del Pare/Mare/Tutor</h2>
            <div className="bg-white border rounded-lg shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Nom i Cognoms <span className="text-red-500">*</span></label>
                        <input className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.name} onChange={e => setParentInfo({...parentInfo, name: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">DNI/NIE <span className="text-red-500">*</span></label>
                        <input className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.dni} onChange={e => setParentInfo({...parentInfo, dni: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Telèfon 1 <span className="text-red-500">*</span></label>
                        <input type="tel" className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.phone1} onChange={e => setParentInfo({...parentInfo, phone1: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Telèfon 2 (Opcional)</label>
                        <input type="tel" className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.phone2} onChange={e => setParentInfo({...parentInfo, phone2: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Email 1 <span className="text-red-500">*</span></label>
                        <input type="email" className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.email1} onChange={e => setParentInfo({...parentInfo, email1: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Email 2 (Opcional)</label>
                        <input type="email" className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" value={parentInfo.email2} onChange={e => setParentInfo({...parentInfo, email2: e.target.value})} />
                    </div>
                    <div className="md:col-span-2 space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Sou socis de l'AFA? <span className="text-red-500">*</span></label>
                        <div className="flex space-x-6">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" name="afa_member" value="true" checked={parentInfo.isAfaMember === 'true'} onChange={() => setParentInfo({...parentInfo, isAfaMember: 'true'})} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                                <span>Sí</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" name="afa_member" value="false" checked={parentInfo.isAfaMember === 'false'} onChange={() => setParentInfo({...parentInfo, isAfaMember: 'false'})} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                                <span>No</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* --- Additional Info Section --- */}
        <section className="space-y-6">
            <h2 className="text-xl font-semibold border-b pb-2">Informació Addicional</h2>
            <div className="bg-white border rounded-lg shadow-sm p-6 space-y-6">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Malalties, al·lèrgies o medicació</label>
                    <input 
                        className="flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        value={additionalInfo.healthInfo} 
                        onChange={e => setAdditionalInfo({...additionalInfo, healthInfo: e.target.value})} 
                        placeholder="Deixar en blanc si no n'hi ha" 
                    />
                </div>
                
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Autorització de drets d'imatge <span className="text-red-500">*</span></label>
                    <p className="text-xs text-gray-500">
                         Autoritzo l'ús d'imatges en fotografies i/o vídeos realitzats per l'AFA per a la web i xarxes socials.
                    </p>
                    <div className="flex flex-col space-y-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="img_rights" value="si" checked={additionalInfo.imageRights === 'si'} onChange={() => setAdditionalInfo({...additionalInfo, imageRights: 'si'})} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                            <span>Sí, autoritzo el tractament de la imatge.</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="img_rights" value="no" checked={additionalInfo.imageRights === 'no'} onChange={() => setAdditionalInfo({...additionalInfo, imageRights: 'no'})} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                            <span>No, no autoritzo el tractament de la imatge.</span>
                        </label>
                    </div>
                </div>

                <div className="space-y-3">
                     <label className="block text-sm font-medium text-gray-700">Autorització de sortida sola/sol <span className="text-red-500">*</span></label>
                     <p className="text-xs text-gray-500">L'alumne/a pot marxar sol/a en finalitzar l'activitat?</p>
                     <div className="flex space-x-6">
                         <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="leave_alone" value="true" checked={additionalInfo.canLeaveAlone === 'true'} onChange={() => setAdditionalInfo({...additionalInfo, canLeaveAlone: 'true'})} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                            <span>Sí</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="leave_alone" value="false" checked={additionalInfo.canLeaveAlone === 'false'} onChange={() => setAdditionalInfo({...additionalInfo, canLeaveAlone: 'false'})} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                            <span>No</span>
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
                            He llegit i accepto les <a href="#" className="text-blue-600 underline hover:text-blue-800">condicions de les extraescolars i acollida</a>. <span className="text-red-500">*</span>
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
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Enviar Preinscripció'}
            </button>
            <p className="text-center text-xs text-gray-500 mt-4">
                En enviar el formulari, acceptes la política de privacitat del centre.
            </p>
        </div>

      </form>
    </div>
  );
}
