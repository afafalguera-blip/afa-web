-- =============================================
-- Migration: Create FAQs Table
-- Description: Editable FAQ entries for the extraescolars section.
--   Each row is one question/answer, grouped by `category`, multilingual
--   via the `translations` JSONB column ({ ca|es|en: {category, question, answer} }).
-- =============================================

CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,                 -- grouping slug (e.g. 'inscripcions')
  question text NOT NULL,                 -- es fallback (legacy/flat)
  answer text NOT NULL,                   -- es fallback (legacy/flat)
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faqs_active_order ON public.faqs(is_active, sort_order);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Anyone can read active FAQs
DROP POLICY IF EXISTS "Anyone can read active faqs" ON public.faqs;
CREATE POLICY "Anyone can read active faqs"
  ON public.faqs
  FOR SELECT TO PUBLIC
  USING (is_active = true);

-- Admins/coordinators manage everything
DROP POLICY IF EXISTS "Admins can manage faqs" ON public.faqs;
CREATE POLICY "Admins can manage faqs"
  ON public.faqs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coordinator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coordinator')
    )
  );

-- updated_at trigger (reuse shared function from earlier migrations)
DROP TRIGGER IF EXISTS update_faqs_updated_at ON public.faqs;
CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE public.faqs IS 'Editable FAQ entries shown in the extraescolars section.';

-- =============================================
-- Seed data (only if table is empty)
-- =============================================
INSERT INTO public.faqs (category, question, answer, sort_order, translations)
SELECT * FROM (VALUES
  -- Inscripciones, plazas y lista de espera
  ('inscripcions',
   '¿Quién tiene prioridad para conseguir plaza?',
   'Las plazas son limitadas y se asignan por estricto orden de inscripción. La oferta se abre primero al alumnado de la Escuela Falguera y, una vez cerrado ese plazo, al alumnado de otros centros.',
   1,
   '{"ca":{"category":"Inscripcions, places i llista d''espera","question":"Qui té prioritat per aconseguir plaça?","answer":"Les places són limitades i s''assignen per estricte ordre d''inscripció. L''oferta s''obre primer a l''alumnat de l''Escola Falguera i, un cop tancat aquest termini, a l''alumnat d''altres centres."},"es":{"category":"Inscripciones, plazas y lista de espera","question":"¿Quién tiene prioridad para conseguir plaza?","answer":"Las plazas son limitadas y se asignan por estricto orden de inscripción. La oferta se abre primero al alumnado de la Escuela Falguera y, una vez cerrado ese plazo, al alumnado de otros centros."},"en":{"category":"Enrolment, places and waiting list","question":"Who has priority to get a place?","answer":"Places are limited and assigned in strict order of enrolment. Activities are first offered to Escola Falguera pupils and, once that period closes, to pupils from other schools."}}'::jsonb),

  ('inscripcions',
   'Venimos de otro colegio, ¿cómo nos inscribimos?',
   'Las familias de otros centros gestionan todo el proceso de inscripción a través de la web.',
   2,
   '{"ca":{"category":"Inscripcions, places i llista d''espera","question":"Venim d''una altra escola, com ens inscrivim?","answer":"Les famílies d''altres centres gestionen tot el procés d''inscripció a través del web."},"es":{"category":"Inscripciones, plazas y lista de espera","question":"Venimos de otro colegio, ¿cómo nos inscribimos?","answer":"Las familias de otros centros gestionan todo el proceso de inscripción a través de la web."},"en":{"category":"Enrolment, places and waiting list","question":"We come from another school, how do we enrol?","answer":"Families from other schools complete the whole enrolment process through the website."}}'::jsonb),

  ('inscripcions',
   '¿Cuándo sabremos si la actividad se confirma y si tenemos plaza?',
   'El 15 de julio publicaremos la primera lista de actividades confirmadas. El plazo de inscripción seguirá abierto en aquellas actividades con plazas disponibles.',
   3,
   '{"ca":{"category":"Inscripcions, places i llista d''espera","question":"Quan sabrem si l''activitat es confirma i si tenim plaça?","answer":"El 15 de juliol publicarem la primera llista d''activitats confirmades. El termini d''inscripció seguirà obert en aquelles activitats amb places disponibles."},"es":{"category":"Inscripciones, plazas y lista de espera","question":"¿Cuándo sabremos si la actividad se confirma y si tenemos plaza?","answer":"El 15 de julio publicaremos la primera lista de actividades confirmadas. El plazo de inscripción seguirá abierto en aquellas actividades con plazas disponibles."},"en":{"category":"Enrolment, places and waiting list","question":"When will we know if the activity goes ahead and if we have a place?","answer":"On 15 July we will publish the first list of confirmed activities. Enrolment will remain open for activities that still have places available."}}'::jsonb),

  ('inscripcions',
   'Estamos en lista de espera, ¿qué pasa si se libera una plaza?',
   'Os avisaremos en cuanto quede una vacante. Tendréis 72 horas para confirmar la asistencia; si no recibimos respuesta, la plaza pasará a la siguiente familia de la lista.',
   4,
   '{"ca":{"category":"Inscripcions, places i llista d''espera","question":"Som a la llista d''espera, què passa si s''allibera una plaça?","answer":"Us avisarem tan aviat com quedi una vacant. Tindreu 72 hores per confirmar l''assistència; si no rebem resposta, la plaça passarà a la següent família de la llista."},"es":{"category":"Inscripciones, plazas y lista de espera","question":"Estamos en lista de espera, ¿qué pasa si se libera una plaza?","answer":"Os avisaremos en cuanto quede una vacante. Tendréis 72 horas para confirmar la asistencia; si no recibimos respuesta, la plaza pasará a la siguiente familia de la lista."},"en":{"category":"Enrolment, places and waiting list","question":"We are on the waiting list, what happens if a place opens up?","answer":"We will contact you as soon as a place becomes available. You will have 72 hours to confirm attendance; if we receive no reply, the place passes to the next family on the list."}}'::jsonb),

  -- Cuotas, pagos y AFA
  ('quotes',
   'Somos de otro colegio, ¿podemos hacernos socios del AFA?',
   'Sí. La condición de socio del AFA está abierta a familias de cualquier centro y da acceso a las cuotas reducidas de las extraescolares.',
   5,
   '{"ca":{"category":"Quotes, pagaments i AFA","question":"Som d''una altra escola, ens podem fer socis de l''AFA?","answer":"Sí. La condició de soci de l''AFA està oberta a famílies de qualsevol centre i dona accés a les quotes reduïdes de les extraescolars."},"es":{"category":"Cuotas, pagos y AFA","question":"Somos de otro colegio, ¿podemos hacernos socios del AFA?","answer":"Sí. La condición de socio del AFA está abierta a familias de cualquier centro y da acceso a las cuotas reducidas de las extraescolares."},"en":{"category":"Fees, payments and the AFA","question":"We are from another school, can we become AFA members?","answer":"Yes. AFA membership is open to families from any school and gives access to the reduced fees for extracurricular activities."}}'::jsonb),

  ('quotes',
   '¿Cómo funciona la cuota reducida «Multiactivitat»?',
   'La promoción «Multiactivitat» permite combinar cualquier actividad del catálogo. La única excepción son las clases de inglés, que tienen condiciones propias.',
   6,
   '{"ca":{"category":"Quotes, pagaments i AFA","question":"Com funciona la quota reduïda «Multiactivitat»?","answer":"La promoció «Multiactivitat» permet combinar qualsevol activitat del catàleg. L''única excepció són les classes d''anglès, que tenen condicions pròpies."},"es":{"category":"Cuotas, pagos y AFA","question":"¿Cómo funciona la cuota reducida «Multiactivitat»?","answer":"La promoción «Multiactivitat» permite combinar cualquier actividad del catálogo. La única excepción son las clases de inglés, que tienen condiciones propias."},"en":{"category":"Fees, payments and the AFA","question":"How does the reduced \"Multiactivitat\" fee work?","answer":"The \"Multiactivitat\" offer lets you combine any activity in the catalogue. The only exception is English classes, which have their own terms."}}'::jsonb),

  ('quotes',
   '¿Cómo y cuándo se pagan las cuotas?',
   'Las mensualidades se abonan por transferencia bancaria. Ahora estamos en fase de preinscripción, así que todavía no hay que realizar ningún pago.',
   7,
   '{"ca":{"category":"Quotes, pagaments i AFA","question":"Com i quan es paguen les quotes?","answer":"Les mensualitats s''abonen per transferència bancària. Ara estem en fase de preinscripció, així que encara no cal fer cap pagament."},"es":{"category":"Cuotas, pagos y AFA","question":"¿Cómo y cuándo se pagan las cuotas?","answer":"Las mensualidades se abonan por transferencia bancaria. Ahora estamos en fase de preinscripción, así que todavía no hay que realizar ningún pago."},"en":{"category":"Fees, payments and the AFA","question":"How and when are fees paid?","answer":"Monthly fees are paid by bank transfer. We are currently in the pre-registration phase, so no payment is required yet."}}'::jsonb),

  -- Clases de inglés
  ('angles',
   '¿Cómo se paga la cuota y el material de inglés?',
   'El inglés lo imparte una academia externa. Debéis marcar la opción en nuestro formulario web para registrar la preinscripción, pero los pagos, las gestiones y el coste del material se tramitan directamente con la academia.',
   8,
   '{"ca":{"category":"Classes d''anglès","question":"Com es paga la quota i el material d''anglès?","answer":"L''anglès l''imparteix una acadèmia externa. Heu de marcar l''opció al nostre formulari web per registrar la preinscripció, però els pagaments, les gestions i el cost del material es tramiten directament amb l''acadèmia."},"es":{"category":"Clases de inglés","question":"¿Cómo se paga la cuota y el material de inglés?","answer":"El inglés lo imparte una academia externa. Debéis marcar la opción en nuestro formulario web para registrar la preinscripción, pero los pagos, las gestiones y el coste del material se tramitan directamente con la academia."},"en":{"category":"English classes","question":"How are the English fee and materials paid?","answer":"English is taught by an external academy. You must tick the option on our web form to register the pre-registration, but payments, arrangements and the cost of materials are handled directly with the academy."}}'::jsonb),

  ('angles',
   '¿Se puede hacer inglés dos días por semana?',
   'Sí. En el formulario podéis indicar si os interesa un segundo día semanal. La opción de dos días solo se ofrece al segundo ciclo de primaria (4.º, 5.º y 6.º). Tarifas: 39 €/mes un día o 48 €/mes los dos días.',
   9,
   '{"ca":{"category":"Classes d''anglès","question":"Es pot fer anglès dos dies per setmana?","answer":"Sí. Al formulari podeu indicar si us interessa un segon dia setmanal. L''opció de dos dies només s''ofereix al cicle superior de primària (4t, 5è i 6è). Tarifes: 39 €/mes un dia o 48 €/mes els dos dies."},"es":{"category":"Clases de inglés","question":"¿Se puede hacer inglés dos días por semana?","answer":"Sí. En el formulario podéis indicar si os interesa un segundo día semanal. La opción de dos días solo se ofrece al segundo ciclo de primaria (4.º, 5.º y 6.º). Tarifas: 39 €/mes un día o 48 €/mes los dos días."},"en":{"category":"English classes","question":"Can English be taken two days a week?","answer":"Yes. On the form you can indicate whether you are interested in a second weekly day. The two-day option is only offered to upper-primary pupils (Years 4, 5 and 6). Fees: €39/month for one day or €48/month for both days."}}'::jsonb)
) AS seed(category, question, answer, sort_order, translations)
WHERE NOT EXISTS (SELECT 1 FROM public.faqs);
