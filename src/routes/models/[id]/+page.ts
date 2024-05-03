import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import effects from '../../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  const { id } = params;
  const modelId = parseFloat(id);

  if (!Number.isNaN(modelId)) {
    const initialModel = await effects.getModel(modelId, user);

    if (initialModel) {
      return {
        initialModel,
        user,
      };
    }
  }

  redirect(302, `${base}/models`);
};
