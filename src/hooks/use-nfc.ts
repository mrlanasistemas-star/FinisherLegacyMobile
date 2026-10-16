import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { claimNfcTag, resolveNfcTag } from '@/api/nfc';
import { queryKeys } from '@/hooks/query-keys';
import { useAuthStore } from '@/stores/authStore';
import { haptics } from '@/utils/haptics';
import { ensureOnline } from '@/utils/network';

/** Resolution depends on who is looking (`owned_by_me`, `can_claim`), so the session is part of the key. */
export function useNfcTag(token: string) {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: queryKeys.nfc(token, status === 'authenticated'),
    queryFn: () => resolveNfcTag(token),
    enabled: !!token,
    staleTime: 0,
  });
}

export function useClaimNfcTag(token: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await ensureOnline();
      return claimNfcTag(token);
    },
    onSuccess: () => {
      haptics.success();
      client.invalidateQueries({ queryKey: ['nfc', token] });
      client.invalidateQueries({ queryKey: queryKeys.myGear });
      client.invalidateQueries({ queryKey: queryKeys.profile });
    },
    onError: () => haptics.error(),
  });
}
