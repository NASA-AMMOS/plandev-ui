import type { Request } from '@sveltejs/kit';
import { Db } from '../../db';
import type { View } from '../../types';

export type ViewGetResponseBody = {
  views: any[];
};
export type ViewGetResponse = {
  body: ViewGetResponseBody;
};

export type ViewPostRequestBody = { name: string; view: View };
export type ViewPostResponseBody = {
  message: string;
  success: boolean;
  view: View | null;
};
export type ViewPostResponse = {
  body: ViewPostResponseBody;
};

export async function get(): Promise<ViewGetResponse> {
  const dbPool = await Db.getPool();

  const { rows = [] } = await dbPool.query(`
    SELECT view
    FROM ui.view
    ORDER BY view->'meta'->>'timeUpdated' DESC;
  `);
  const views = rows.map(({ view }) => ({
    id: view.id,
    meta: view.meta,
    name: view.name,
  }));

  return {
    body: {
      views,
    },
  };
}

export async function post(
  req: Request<Record<string, any>, ViewPostRequestBody>,
): Promise<ViewPostResponse> {
  const dbPool = await Db.getPool();
  const { body, locals } = req;
  const { user } = locals;
  const { userId = '' } = user;
  const { name, view: newView } = body;

  const id = Db.uniqueId();
  const now = Date.now();
  const meta = {
    owner: userId,
    timeCreated: now,
    timeUpdated: now,
    version: '0.10.0',
  };
  const view = { ...newView, id, meta, name };
  const viewStr = JSON.stringify({ ...newView, id, meta, name });

  const { rowCount } = await dbPool.query(`
    INSERT INTO ui.view (id, view)
    VALUES ('${id}', '${viewStr}');
  `);

  if (rowCount > 0) {
    return {
      body: {
        message: `${id} created`,
        success: true,
        view,
      },
    };
  } else {
    return {
      body: {
        message: `${id} not created`,
        success: false,
        view: null,
      },
    };
  }
}
