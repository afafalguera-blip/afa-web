-- =============================================================
-- Migración: baja del precio del día suelto de acollida
-- Fecha: 2026-09-08
--
-- Las franjas de tarde cobran el día suelto a 1,5 veces el prorrateo de la
-- cuota mensual; las de mañana lo cobraban al triple. Esta migración aplica a
-- las mañanas el criterio intermedio (x2) que quedó escrito en
-- docs/acollida-decisions-2026-09.md, manteniendo el diferencial de socio.
--
--   Franja        Socia         No socia
--   7:30H a 9H    10 -> 6,50    14 -> 9,50
--   8H a 9H        7 -> 4,50    11 -> 7
--   8:30H a 9H     4 -> 3        8 -> 4,50
--
-- Las cuotas mensuales NO se tocan: el servicio de mañana solo se sostiene con
-- la franja larga, y son las mensuales las que pagan los 500 EUR del
-- monitoraje. El tope ya está en marcha desde
-- 20260905140000_acollida_occasional_cap.sql, así que bajar el día no puede
-- hundir los ingresos: quien viene muchos días sigue pagando la cuota.
--
-- OJO: el importe de una solicitud ocasional se calcula al vuelo desde la
-- tarifa (`acollida_price_for()` / `acollida_month_amount()`), no se copia al
-- inscribirse. Las solicitudes ocasionales que ya existan pasarán a facturar el
-- precio nuevo, también las de meses ya empezados.
--
-- Queda en audit_logs como cambio de "Sistema" (changed_by NULL): no lo hace
-- un admin desde el panel.
--
-- Idempotente: cada fila solo se toca si sigue teniendo el precio viejo, así
-- que reaplicarla no pisa un cambio posterior hecho desde /admin/acollida.
-- =============================================================

UPDATE public.acollida_rates AS r
SET preu_soci_ocasional    = nuevos.soci,
    preu_no_soci_ocasional = nuevos.no_soci,
    updated_at             = now()
FROM (VALUES
  ('7:30H A 9H', 10::numeric, 14::numeric, 6.50::numeric, 9.50::numeric),
  ('8H A 9H',     7::numeric, 11::numeric, 4.50::numeric, 7.00::numeric),
  ('8:30H A 9H',  4::numeric,  8::numeric, 3.00::numeric, 4.50::numeric)
) AS nuevos(horari, soci_antic, no_soci_antic, soci, no_soci)
WHERE r.horari = nuevos.horari
  AND r.preu_soci_ocasional    IS NOT DISTINCT FROM nuevos.soci_antic
  AND r.preu_no_soci_ocasional IS NOT DISTINCT FROM nuevos.no_soci_antic;
