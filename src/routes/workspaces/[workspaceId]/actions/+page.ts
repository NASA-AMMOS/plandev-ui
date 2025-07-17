import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  // Get data from parent layout which includes initialWorkspace and user
  return await parent();
};
