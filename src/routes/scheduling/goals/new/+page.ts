import effects from '../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../utilities/generic';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
  const specId: string | null = url.searchParams.get('specId');
  const initialSpecId: number | null = parseFloatOrNull(specId);
  const initialModels = await effects.getModels();

  return {
    initialModels,
    initialSpecId,
  };
};
