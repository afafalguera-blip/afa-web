-- =============================================================
-- Migración: la atención presencial pasa a ser a demanda
-- Fecha: 2026-09-09
--
-- La AFA ya no abre un rato fijo los lunes: abre cuando alguien lo pide por
-- correo. Lo comunicó la junta el 2026-09-09.
--
-- El horario vivía en site_config.contact.schedule con el texto
-- «Dilluns: 9.00 a 10.30 h», un campo sin traducir que salía igual en las tres
-- versiones de la página. Se deja vacío para que la línea la ponga el catálogo
-- de idiomas (`contact_page.schedule_on_demand`), que sí está traducido; el
-- panel puede volver a escribir un horario fijo cuando haga falta y entonces
-- ese texto vuelve a mandar.
--
-- Guardada por el valor viejo: si alguien ya lo ha cambiado desde
-- /admin/settings, esta migración no lo pisa.
--
-- Idempotente: al segundo pase el horario ya no es el de antes y no hace nada.
-- =============================================================

UPDATE public.site_config
SET value = jsonb_set(value, '{schedule}', '""'::jsonb),
    updated_at = now()
WHERE key = 'contact'
  AND value ->> 'schedule' = 'Dilluns: 9.00 a 10.30 h';
