import effects from '../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../utilities/generic';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
  const modelId: string | null = url.searchParams.get('modelId');
  const specId: string | null = url.searchParams.get('specId');
  const initialModelId: number | null = parseFloatOrNull(modelId);
  const initialSpecId: number | null = parseFloatOrNull(specId);
  const initialModels = await effects.getModels();

  return {
    initialModelId,
    initialModels,
    initialSpecId,
  };
};
