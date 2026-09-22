export type SupportStatusVariant = 'gold' | 'neutral' | 'success' | 'destructive';

/** Real enum: `App\Enums\SupportSessionStatus` (draft/open/active/completed/cancelled) — confirmed against the backend source. */
export const SUPPORT_STATUS_COPY: Record<string, { label: string; variant: SupportStatusVariant }> = {
  draft: { label: 'Borrador', variant: 'neutral' },
  open: { label: 'Abierta', variant: 'gold' },
  active: { label: 'Activa', variant: 'gold' },
  completed: { label: 'Completada', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
};

export function describeSupportStatus(status: string): { label: string; variant: SupportStatusVariant } {
  return SUPPORT_STATUS_COPY[status] ?? { label: status, variant: 'neutral' };
}
