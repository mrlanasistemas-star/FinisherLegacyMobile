import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { claimLegacyCode, lookupLegacyCode } from '@/api/legacyCodes';

export function useLegacyCodeLookup(code: string) {
  return useQuery({
    queryKey: ['legacy-codes', code],
    queryFn: () => lookupLegacyCode(code),
    enabled: !!code,
    retry: false,
  });
}

export function useClaimLegacyCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => claimLegacyCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medals'] });
    },
  });
}
