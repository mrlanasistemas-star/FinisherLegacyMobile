import { t } from '@/i18n';

/**
 * The greeting of the moment as ONE sentence with the person's name in it
 * ("Buenos días, Ana" / "Good morning, Ana"): where the name goes — and the
 * punctuation around it — is the translator's call. Without `name` the
 * `{name}` marker is left in place so a screen can style the name on its
 * own (`splitMarkers(text, ['name'])`).
 */
export function timeOfDayGreeting(name?: string | null, date: Date = new Date()): string {
  const hour = date.getHours();
  const params = name ? { name } : undefined;

  if (hour < 12) return t('Buenos días, {name}', params);
  if (hour < 19) return t('Buenas tardes, {name}', params);
  return t('Buenas noches, {name}', params);
}

/** The greeting alone, for when there is no name to greet. */
export function timeOfDayGreetingAlone(date: Date = new Date()): string {
  const hour = date.getHours();

  if (hour < 12) return t('Buenos días');
  if (hour < 19) return t('Buenas tardes');
  return t('Buenas noches');
}
