import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createMedal, deleteMedal, updateMedal, type CreateMedalPayload, type UpdateMedalPayload } from '@/api/medals';

export function useCreateMedal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMedalPayload) => createMedal(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medals'] });
    },
  });
}

export function useUpdateMedal(uuid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateMedalPayload) => updateMedal(uuid, payload),
    onSuccess: (medal) => {
      queryClient.setQueryData(['medals', uuid], medal);
      queryClient.invalidateQueries({ queryKey: ['medals'] });
    },
  });
}

export function useDeleteMedal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uuid: string) => deleteMedal(uuid),
    onSuccess: (_data, uuid) => {
      queryClient.removeQueries({ queryKey: ['medals', uuid] });
      queryClient.invalidateQueries({ queryKey: ['medals'] });
    },
  });
}
