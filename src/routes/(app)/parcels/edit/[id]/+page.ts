import { browser } from '$app/environment';
import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { userStore } from '../../../../../lib/stores/auth';
import type { User } from '../../../../../types/app';
import type { Parcel } from '../../../../../types/sequencing';
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

  const { id: parcelIdParam } = params;

  if (parcelIdParam !== null && parcelIdParam !== undefined) {
    const parcelIdAsNumber = parseFloatOrNull(parcelIdParam);

    if (parcelIdAsNumber !== null) {
      const initialParcel: Parcel | null = await effects.getParcel(parcelIdAsNumber, user);

      if (initialParcel !== null) {
        return {
          initialParcel,
          user,
        };
      }
    }
  }

  redirect(302, `${base}/parcels`);
};
