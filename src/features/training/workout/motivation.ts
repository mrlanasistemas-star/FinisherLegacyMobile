import { t, tc } from '@/i18n';

/**
 * Short encouraging copy for Modo entrenamiento — a function per moment so
 * every line is resolved in the language active when it is shown. Never
 * about calories, never a fake comparison: only what the workout really
 * contains (time, distance measured by GPS, a real personal record).
 */

/** A rotating line under the clock while the workout runs (index = minute of workout). */
export function runningLine(minute: number): string {
  const lines = [
    t('Un paso a la vez. Lo estás haciendo.'),
    t('Respira, suelta los hombros y sigue.'),
    t('Cada minuto de hoy cuenta para tu próxima meta.'),
    t('Tu constancia es tu Legacy.'),
    t('Encuentra tu ritmo y disfrútalo.'),
  ];
  return lines[Math.abs(Math.floor(minute / 5)) % lines.length];
}

export function milestoneLine(milestone: { kind: 'km'; value: number } | { kind: 'minutes'; value: number }): string {
  if (milestone.kind === 'km') return tc('¡{count} km! Sigue así.|¡{count} km! Sigue así.', milestone.value);
  return tc('¡{count} minuto de entrenamiento!|¡{count} minutos de entrenamiento!', milestone.value);
}

/** Headline of the summary screen. */
export function finishHeadline(opts: { durationS: number; newRecord: '5k' | '10k' | 'distance' | null }): string {
  if (opts.newRecord === '5k') return t('¡Nuevo récord personal en 5 km!');
  if (opts.newRecord === '10k') return t('¡Nuevo récord personal en 10 km!');
  if (opts.newRecord === 'distance') return t('¡Tu entrenamiento más largo hasta hoy!');
  if (opts.durationS >= 3600) return t('Más de una hora. Eso es disciplina.');
  if (opts.durationS >= 1200) return t('Entrenamiento completo. Bien hecho.');
  return t('Cada entrenamiento suma. Bien hecho.');
}
