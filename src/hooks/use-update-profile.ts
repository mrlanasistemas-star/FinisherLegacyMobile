import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateProfile, type UpdateProfilePayload } from '@/api/profile';
import { queryKeys } from '@/hooks/query-keys';
import type { MyProfileResponse } from '@/types/models';
import { ensureOnline } from '@/utils/network';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      await ensureOnline();
      return updateProfile(payload);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData<MyProfileResponse>(queryKeys.profile, (data) => (data ? { ...data, profile } : data));
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      queryClient.invalidateQueries({ queryKey: queryKeys.athlete(profile.username) });
    },
  });
}
