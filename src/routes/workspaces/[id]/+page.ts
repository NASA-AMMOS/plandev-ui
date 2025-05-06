import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  const { id: workspaceId } = params;

  // const initialWorkspace = await effects.getWorkspace(workspaceId, user);

  // if (initialWorkspace) {
  //   return {
  //     initialSequence,
  //     initialWorkspace,
  //     user,
  //   };
  // }

  // return {
  //   initialWorkspace,
  // };

  return {
    initialWorkspace: {
      created_at: '',
      id: workspaceId,
      name: 'Foo',
      owner: 'bar',
      parcel_id: 1,
      tags: [],
      updated_at: '',
    },
    user,
  };
};
