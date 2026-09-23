import { useQuery } from '@tanstack/react-query';

import { fetchProfile } from '@/api/profile';
import { queryKeys } from '@/hooks/query-keys';

/**
 * `GET /profile` → `{athlete, profile, stats, social}`. (Before this, the
 * app read `data` as if it were the bare AthleteProfile, so the username
 * never showed — `profile` is nested.)
 */
export function useProfile() {
  return useQuery({ queryKey: queryKeys.profile, queryFn: fetchProfile });
}
