import { useQuery } from '@tanstack/react-query';

import { fetchPublicAthlete } from '@/api/athletes';

export function usePublicAthlete(username: string) {
  return useQuery({
    queryKey: ['athletes', username],
    queryFn: () => fetchPublicAthlete(username),
    enabled: !!username,
  });
}
