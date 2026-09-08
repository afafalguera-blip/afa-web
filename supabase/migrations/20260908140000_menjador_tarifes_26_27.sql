-- =============================================================
-- Migración: tarifas del menjador del curso 2026/2027
-- Fecha: 2026-09-08
--
-- Azertia Facility Services (la empresa del menjador) comunicó por carta del
-- 22 de junio de 2026 la subida del 3,85% para el curso 2026/2027:
--
--   Usuario fijo       7,30 EUR -> 7,58 EUR
--   Usuario esporádico 7,80 EUR -> 8,10 EUR
--
-- (Los máximos del Departament d'Ensenyament para el mismo curso son 7,83 EUR
-- y 8,61 EUR, así que quedan por debajo.)
--
-- La web nunca ha llegado a publicar un precio de menjador: las dos filas
-- salieron sembradas con un guion en 20260506000000_menjador_and_board_members
-- y ahí siguen. Por eso la guarda es «el precio no tiene ningún dígito»: toca
-- solo el marcador de posición, y si alguien ya ha escrito una cifra desde
-- /admin/menjador, esta migración no la pisa.
--
-- MISMO PRECIO PARA SOCIAS Y NO SOCIAS: la carta fija un precio por comensal y
-- no distingue. La página tiene dos columnas porque acollida y extraescolars sí
-- diferencian; si la AFA decide cobrar un recargo a las no socias, se cambia
-- desde el panel.
--
-- Idempotente: al segundo pase el precio ya tiene dígitos y no se toca nada.
-- =============================================================

UPDATE public.menjador_rates
SET preu_soci    = '7,58 €',
    preu_no_soci = '7,58 €',
    updated_at   = now()
WHERE rate_type = 'fix'
  AND preu_soci !~ '[0-9]'
  AND preu_no_soci !~ '[0-9]';

UPDATE public.menjador_rates
SET preu_soci    = '8,10 €',
    preu_no_soci = '8,10 €',
    updated_at   = now()
WHERE rate_type = 'esporadic'
  AND preu_soci !~ '[0-9]'
  AND preu_no_soci !~ '[0-9]';

-- ---------------------------------------------------------------
-- De paso: los textos de estas dos filas están en producción con la codificación
-- rota («mig mes o mÃ©s»), y se ven así en la página pública. El fichero de
-- 20260506000000 los escribe bien, así que se mangló al aplicarlo entonces; el
-- resto de tablas sembradas por esa misma migración (site_config.menjador_info)
-- están correctas.
--
-- Se reescriben con el texto que esa migración quería poner. Solo si siguen
-- mostrando la marca del destrozo (una Ã donde va un acento): un texto ya
-- corregido a mano desde el panel no se toca.
-- ---------------------------------------------------------------

UPDATE public.menjador_rates
SET label_ca   = 'Fix (mig mes o més + 1 dia)',
    label_es   = 'Fijo (medio mes o más + 1 día)',
    label_en   = 'Fixed (half month or more + 1 day)',
    note       = 'Preu per dia. Aplicable a alumnes que es queden la meitat del mes o més.',
    note_ca    = 'Preu per dia. Aplicable a alumnes que es queden la meitat del mes o més.',
    note_es    = 'Precio por día. Aplicable al alumnado que se queda la mitad del mes o más.',
    note_en    = 'Price per day. Applies to pupils staying half the month or more.',
    updated_at = now()
WHERE rate_type = 'fix'
  AND (label_ca LIKE '%Ã%' OR note_ca LIKE '%Ã%');

UPDATE public.menjador_rates
SET label      = 'Esporàdic',
    label_ca   = 'Esporàdic',
    label_es   = 'Esporádico',
    label_en   = 'Sporadic',
    note       = 'Preu per dia solt. Cal avisar a l''AFA al matí.',
    note_ca    = 'Preu per dia solt. Cal avisar a l''AFA al matí.',
    note_es    = 'Precio por día suelto. Hay que avisar al AFA por la mañana.',
    note_en    = 'Price per individual day. Notify the AFA in the morning.',
    updated_at = now()
WHERE rate_type = 'esporadic'
  AND (label LIKE '%Ã%' OR label_ca LIKE '%Ã%' OR note_ca LIKE '%Ã%');
