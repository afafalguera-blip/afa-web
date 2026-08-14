// Cuenta de días laborables para el aviso de actividad.
//
// Por qué laborables y no naturales: la escuela no funciona en fin de semana.
// Un aviso que cuenta días naturales salta cada lunes por haber pasado el
// sábado y el domingo, y un aviso que salta siempre se ignora — con lo cual el
// día que pase algo de verdad tampoco lo mirará nadie.
//
// Vive en _shared/ y no dentro de la función porque src/tests/businessDays.test.ts
// lo importa: la lógica que decide si se manda un correo a las 7 de la mañana
// sin nadie delante tiene que estar cubierta por tests.
//
// Limitación asumida: no se restan los festivos locales. Un festivo entre
// semana cuenta como laborable, así que en una semana con puente el aviso puede
// llegar un día antes de lo estricto. Se prefiere eso a mantener a mano un
// calendario de festivos de Catalunya que caduca cada año. El correo lo dice:
// la primera causa que ofrece es justamente vacaciones o festivo.

/** Días laborables (lunes a viernes) transcurridos entre dos instantes, en UTC. */
export function businessDaysBetween(from: Date, to: Date): number {
  if (!(from instanceof Date) || !(to instanceof Date)) return 0;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  if (to <= from) return 0;

  const DIA = 24 * 60 * 60 * 1000;

  // Se cuenta por días de calendario completos: de la medianoche siguiente a
  // `from` hasta la medianoche de `to`. Así el resultado no depende de la hora
  // a la que corra el cron.
  const inicio = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const fin = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());

  let laborables = 0;
  for (let d = inicio + DIA; d <= fin; d += DIA) {
    const diaSemana = new Date(d).getUTCDay(); // 0 domingo, 6 sábado
    if (diaSemana !== 0 && diaSemana !== 6) laborables++;
  }
  return laborables;
}

/**
 * Decide si toca avisar.
 *
 * - `ultimaActividad` nula significa que no hay ni una fila en ninguna de las
 *   fuentes: eso no es un parón, es una base recién creada o mal consultada, y
 *   avisar sería ruido. No se avisa.
 * - `ultimoAviso` evita repetir el mismo correo cada mañana mientras dure el
 *   parón: un aviso diario se convierte en filtro de correo en tres días.
 */
export function decidirAviso(params: {
  ahora: Date;
  ultimaActividad: Date | null;
  ultimoAviso: Date | null;
  umbralLaborables: number;
  silencioDias: number;
}): { avisar: boolean; laborablesSinActividad: number; motivo: string } {
  const { ahora, ultimaActividad, ultimoAviso, umbralLaborables, silencioDias } = params;

  if (!ultimaActividad) {
    return { avisar: false, laborablesSinActividad: 0, motivo: 'sin datos de actividad' };
  }

  const laborables = businessDaysBetween(ultimaActividad, ahora);

  if (laborables < umbralLaborables) {
    return { avisar: false, laborablesSinActividad: laborables, motivo: 'hay actividad reciente' };
  }

  if (ultimoAviso) {
    const desdeElAviso = (ahora.getTime() - ultimoAviso.getTime()) / (24 * 60 * 60 * 1000);
    if (desdeElAviso < silencioDias) {
      return { avisar: false, laborablesSinActividad: laborables, motivo: 'ya se avisó hace poco' };
    }
  }

  return { avisar: true, laborablesSinActividad: laborables, motivo: 'parón confirmado' };
}
