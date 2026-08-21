import { useEffect, useState } from 'react';

import { useUiStore } from '@/stores/uiStore';

/**
 * Gates a single mascot tip by id — shows once, persisted, never again
 * (AGENTS.md §122). Waits for the persisted seenTips list to hydrate so a
 * tip the user already dismissed doesn't flash back in on cold start.
 */
export function useMascotTip(id: string) {
  const [hydrated, setHydrated] = useState(() => useUiStore.persist.hasHydrated());
  const seen = useUiStore((state) => state.seenTips.includes(id));
  const markTipSeen = useUiStore((state) => state.markTipSeen);

  useEffect(() => {
    if (hydrated) return;
    return useUiStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  return {
    visible: hydrated && !seen,
    dismiss: () => markTipSeen(id),
  };
}
