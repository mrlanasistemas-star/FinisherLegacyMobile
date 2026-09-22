import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { claimGear, fetchMyGear, fetchPublicGear } from '@/api/gear';

export function useMyGear() {
  return useQuery({
    queryKey: ['me', 'gear'],
    queryFn: fetchMyGear,
  });
}

export function usePublicGear(code: string | null) {
  return useQuery({
    queryKey: ['gear', 'public', code],
    queryFn: () => fetchPublicGear(code as string),
    enabled: !!code,
  });
}

export function useClaimGear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => claimGear(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'gear'] });
    },
  });
}
