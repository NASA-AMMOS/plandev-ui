import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';

export const load = async () => {
  // TypeScript command expansion has been removed, replaced by Sequence Templates
  redirect(308, resolve(`/sequence-templates`));
};
