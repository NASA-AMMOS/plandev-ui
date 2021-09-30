import type { Request } from '@sveltejs/kit';
import { Db } from '../../db';
import type { View } from '../../types';

export type ViewLatestGetResponseBody = {
  view: View;
};
export type ViewLatestGetResponse = {
  body: ViewLatestGetResponseBody;
};

export async function get(
  req: Request<Record<string, any>, unknown>,
): Promise<ViewLatestGetResponse> {
  const { locals } = req;
  const { user } = locals;
  const { userId = '' } = user;
  const view = await Db.latestView(userId);
  return {
    body: {
      view,
    },
  };
}
