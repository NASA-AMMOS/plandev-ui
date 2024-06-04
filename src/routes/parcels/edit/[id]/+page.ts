import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import type { Parcel } from '../../../../types/sequencing';
import effects from '../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../utilities/generic';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

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
