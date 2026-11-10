import { t } from '@/i18n';

export function timeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return t('Buenos días');
  if (hour < 19) return t('Buenas tardes');
  return t('Buenas noches');
}
