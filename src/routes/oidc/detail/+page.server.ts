import { enforce } from '$lib/server/auth';
import type { User } from '../../../types/app';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  console.debug('/oidc/detail load'); // move something like this to /+layout.server.ts

  enforce(locals?.user, (u: User | undefined) => {
    return u?.activeRole === 'aerie_admin'; // TODO: write diff rule? this is just an example/test. figure out where to put this kind of stuff
  });

  return {
    user: locals?.user,
  };
};
