import { t } from '@/i18n';

export type SupportStatusVariant = 'gold' | 'neutral' | 'success' | 'destructive';

/** Real enum: `App\Enums\SupportSessionStatus` (draft/open/active/completed/cancelled) — confirmed against the backend source. */
export function describeSupportStatus(status: string): { label: string; variant: SupportStatusVariant } {
  switch (status) {
    case 'draft':
      return { label: t('Borrador'), variant: 'neutral' };
    case 'open':
      return { label: t('Abierta'), variant: 'gold' };
    case 'active':
      return { label: t('Activa'), variant: 'gold' };
    case 'completed':
      return { label: t('Completada'), variant: 'success' };
    case 'cancelled':
      return { label: t('Cancelada'), variant: 'destructive' };
    default:
      return { label: status, variant: 'neutral' };
  }
}
