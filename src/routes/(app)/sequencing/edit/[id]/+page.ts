import { browser } from '$app/environment';
import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { userStore } from '../../../../../lib/stores/auth';
import type { User } from '../../../../../types/app';
import type { UserSequence } from '../../../../../types/sequencing';
import effects from '../../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../../utilities/generic';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  let user: User | null;
  if (browser) {
    user = (await parent()).user;
  } else {
    user = get(userStore);
  }

  const { id: sequenceIdParam } = params;

  if (sequenceIdParam !== null && sequenceIdParam !== undefined) {
    const sequenceIdAsNumber = parseFloatOrNull(sequenceIdParam);

    if (sequenceIdAsNumber !== null) {
      const initialSequence: UserSequence | null = await effects.getUserSequence(sequenceIdAsNumber, user);

      if (initialSequence !== null) {
        return {
          initialSequence,
          user,
        };
      }
    }
  }

  redirect(302, `${base}/sequencing`);
};
