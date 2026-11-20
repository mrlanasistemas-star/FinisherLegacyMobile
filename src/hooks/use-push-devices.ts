import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unregisterPushDevice } from '@/api/pushDevices';

export function useUnregisterPushDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uuid: string) => unregisterPushDevice(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'push-devices'] });
    },
  });
}
