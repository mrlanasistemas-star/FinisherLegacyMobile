import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateProfile, type UpdateProfilePayload } from '@/api/profile';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile'], profile);
    },
  });
}
