import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import type { UserSequence } from '../../../../types/sequencing';
import effects from '../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../utilities/generic';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  if (!user) {
    throw redirect(302, `${base}/login`);
  }

  const { id: sequenceIdParam } = params;

  if (sequenceIdParam !== null && sequenceIdParam !== undefined) {
    const sequenceIdAsNumber = parseFloatOrNull(sequenceIdParam);

    if (sequenceIdAsNumber !== null) {
      const initialSequence: UserSequence | null = await effects.getUserSequence(sequenceIdAsNumber);

      if (initialSequence !== null) {
        return {
          initialSequence,
        };
      }
    }
  }

  throw redirect(302, `${base}/sequencing`);
};
