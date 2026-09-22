import { useMutation, useQueryClient } from '@tanstack/react-query';

import { registerPushDevice, unregisterPushDevice, type RegisterPushDevicePayload } from '@/api/pushDevices';

export function useRegisterPushDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegisterPushDevicePayload) => registerPushDevice(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'push-devices'] });
    },
  });
}

export function useUnregisterPushDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uuid: string) => unregisterPushDevice(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'push-devices'] });
    },
  });
}
