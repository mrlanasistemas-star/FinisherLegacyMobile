import { useQuery } from '@tanstack/react-query';

import { fetchLegacyPlateModels } from '@/api/legacyPlateModels';

export function useLegacyPlateModels() {
  return useQuery({
    queryKey: ['legacy-plate-models'],
    queryFn: fetchLegacyPlateModels,
  });
}
