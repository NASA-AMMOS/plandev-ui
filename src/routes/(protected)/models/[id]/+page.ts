import { browser } from '$app/environment';
import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { userStore } from '../../../../lib/stores/auth';
import type { User } from '../../../../types/app';
import effects from '../../../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  let user: User | null;
  if (browser) {
    user = get(userStore);
  } else {
    user = (await parent()).user;
  }

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
