-- ============================================================
-- Migration: Seed "Servicio de Acogida" sign-up form
-- Date: 2026-06-30
-- Public URL: /f/acollida  (folder: Acollida)
-- Source lang = es (top-level columns). ca/en in translations.
-- Idempotent: ON CONFLICT (slug) DO NOTHING.
-- Captures jornada intensiva / final de curso via the "periode" field,
-- and supports monthly or occasional use. No conditional logic on
-- purpose: logic.value matches the source (es) option string and would
-- break when the visitor switches to ca/en.
-- ============================================================

INSERT INTO public.forms (title, description, slug, folder, is_active, fields_schema, translations)
VALUES (
  'Inscripción · Servicio de Acogida',
  'Rellena este formulario para solicitar el servicio de acogida (mensual u ocasional), incluida la jornada intensiva y el final de curso. El AFA se pondrá en contacto para confirmar plaza y tarifa.',
  'acollida',
  'Acollida',
  true,
  $json$[
    { "id": "sec_infant", "type": "section_header", "label": "Datos del niño/a", "required": false },
    { "id": "infant_nom", "type": "text", "label": "Nombre y apellidos del niño/a", "required": true },
    { "id": "infant_curs", "type": "select", "label": "Curso", "required": true,
      "options": ["P3", "P4", "P5", "1º", "2º", "3º", "4º", "5º", "6º"] },
    { "id": "sec_servei", "type": "section_header", "label": "Servicio solicitado", "required": false },
    { "id": "periode", "type": "select", "label": "Periodo", "required": true,
      "options": ["Curso ordinario", "Jornada intensiva (junio y septiembre)", "Final de curso"] },
    { "id": "modalitat", "type": "radio", "label": "Modalidad", "required": true,
      "options": ["Mensual", "Ocasional (días puntuales)"] },
    { "id": "franja", "type": "select", "label": "Franja horaria", "required": true,
      "options": ["Mañana (antes de clase)", "Tarde (al salir)", "Mañana y tarde"] },
    { "id": "dies", "type": "weekdays", "label": "Días de la semana (si es mensual)", "required": false,
      "options": ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
    { "id": "dates_ocasional", "type": "text", "label": "Fechas concretas (si es ocasional)", "required": false,
      "placeholder": "ej: 12 y 13 de junio" },
    { "id": "sec_contacte", "type": "section_header", "label": "Datos de contacto", "required": false },
    { "id": "tutor_nom", "type": "text", "label": "Nombre y apellidos del padre/madre/tutor", "required": true },
    { "id": "telefon", "type": "phone", "label": "Teléfono", "required": true },
    { "id": "email", "type": "email", "label": "Correo electrónico", "required": true },
    { "id": "soci", "type": "radio", "label": "¿Familia socia del AFA?", "required": true,
      "options": ["Sí", "No"] },
    { "id": "observacions", "type": "long_text", "label": "Observaciones (alergias, quién recoge, etc.)", "required": false },
    { "id": "consentiment", "type": "checkbox", "label": "Protección de datos", "required": true,
      "options": ["Autorizo el tratamiento de los datos para la gestión del servicio de acogida"] }
  ]$json$::jsonb,
  $json${
    "ca": {
      "title": "Inscripció · Servei d'Acollida",
      "description": "Omple aquest formulari per sol·licitar el servei d'acollida (mensual o ocasional), inclosos la jornada intensiva i el final de curs. L'AFA es posarà en contacte per confirmar plaça i tarifa.",
      "fields": {
        "sec_infant": { "label": "Dades de l'infant" },
        "infant_nom": { "label": "Nom i cognoms de l'infant" },
        "infant_curs": { "label": "Curs", "options": ["P3", "P4", "P5", "1r", "2n", "3r", "4t", "5è", "6è"] },
        "sec_servei": { "label": "Servei sol·licitat" },
        "periode": { "label": "Període", "options": ["Curs ordinari", "Jornada intensiva (juny i setembre)", "Final de curs"] },
        "modalitat": { "label": "Modalitat", "options": ["Mensual", "Ocasional (dies puntuals)"] },
        "franja": { "label": "Franja horària", "options": ["Matí (abans de classe)", "Tarda (en sortir)", "Matí i tarda"] },
        "dies": { "label": "Dies de la setmana (si és mensual)", "options": ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres"] },
        "dates_ocasional": { "label": "Dates concretes (si és ocasional)", "placeholder": "ex: 12 i 13 de juny" },
        "sec_contacte": { "label": "Dades de contacte" },
        "tutor_nom": { "label": "Nom i cognoms del pare/mare/tutor" },
        "telefon": { "label": "Telèfon" },
        "email": { "label": "Correu electrònic" },
        "soci": { "label": "Família sòcia de l'AFA?", "options": ["Sí", "No"] },
        "observacions": { "label": "Observacions (al·lèrgies, qui recull, etc.)" },
        "consentiment": { "label": "Protecció de dades", "options": ["Autoritzo el tractament de les dades per a la gestió del servei d'acollida"] }
      }
    },
    "en": {
      "title": "Sign-up · Drop-off Care",
      "description": "Fill in this form to request the drop-off care service (monthly or occasional), including the intensive timetable and end of school year. AFA will get in touch to confirm your place and rate.",
      "fields": {
        "sec_infant": { "label": "Child's details" },
        "infant_nom": { "label": "Child's full name" },
        "infant_curs": { "label": "Year", "options": ["P3", "P4", "P5", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"] },
        "sec_servei": { "label": "Service requested" },
        "periode": { "label": "Period", "options": ["Regular term", "Intensive timetable (June & September)", "End of school year"] },
        "modalitat": { "label": "Type", "options": ["Monthly", "Occasional (specific days)"] },
        "franja": { "label": "Time slot", "options": ["Morning (before class)", "Afternoon (after school)", "Morning and afternoon"] },
        "dies": { "label": "Days of the week (if monthly)", "options": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
        "dates_ocasional": { "label": "Specific dates (if occasional)", "placeholder": "e.g. 12 and 13 June" },
        "sec_contacte": { "label": "Contact details" },
        "tutor_nom": { "label": "Parent/guardian full name" },
        "telefon": { "label": "Phone" },
        "email": { "label": "Email" },
        "soci": { "label": "AFA member family?", "options": ["Yes", "No"] },
        "observacions": { "label": "Notes (allergies, who picks up, etc.)" },
        "consentiment": { "label": "Data protection", "options": ["I authorise the processing of this data to manage the drop-off care service"] }
      }
    }
  }$json$::jsonb
)
ON CONFLICT (slug) DO NOTHING;
