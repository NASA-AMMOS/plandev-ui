import type { Request } from '@sveltejs/kit';
import { Db } from '../../db';
import type { View } from '../../types';

export type ViewIdDelResponseBody = {
  message?: string;
  nextView?: View;
  success: boolean;
};
export type ViewIdDelResponse = {
  body?: ViewIdDelResponseBody;
  status?: number;
};

export type ViewIdGetResponseBody = {
  message?: string;
  view?: View;
  success: boolean;
};
export type ViewIdGetResponse = {
  body?: ViewIdGetResponseBody;
  status?: number;
};

export type ViewIdPutRequestBody = {
  view: View;
};
export type ViewIdPutResponseBody = {
  message: string;
  success: boolean;
};
export type ViewIdPutResponse = {
  body?: ViewIdPutResponseBody;
};

export async function del(
  req: Request<Record<string, any>, unknown>,
): Promise<ViewIdDelResponse> {
  const dbPool = await Db.getPool();
  const { locals, params } = req;
  const { user } = locals;
  const { userId = '' } = user;
  const { id } = params;

  const { rowCount } = await dbPool.query(`
    DELETE FROM ui.view
    WHERE id = '${id}'
    AND view->'meta'->>'owner' = '${userId}';
  `);

  if (rowCount > 0) {
    const nextView = await Db.latestView(userId);
    return {
      body: {
        nextView,
        success: true,
      },
    };
  } else {
    return {
      body: {
        message: `Unable to delete view with ID: ${id}`,
        success: false,
      },
    };
  }
}

export async function get(
  req: Request<Record<string, any>, unknown>,
): Promise<ViewIdGetResponse> {
  const dbPool = await Db.getPool();
  const { params } = req;
  const { id } = params;

  const { rows = [], rowCount } = await dbPool.query(`
    SELECT view
    FROM ui.view
    WHERE id = '${id}';
  `);

  if (rowCount > 0) {
    const [{ view }] = rows;
    return {
      body: {
        success: true,
        view,
      },
    };
  } else {
    return {
      body: {
        message: `View ${id} not found`,
        success: false,
      },
      status: 404,
    };
  }
}

export async function put(
  req: Request<Record<string, any>, ViewIdPutRequestBody>,
): Promise<ViewIdPutResponse> {
  const dbPool = await Db.getPool();
  const { body, locals, params } = req;
  const { view: updatedView } = body;
  const { user } = locals;
  const { userId = '' } = user;
  const { id } = params;

  const { rows } = await dbPool.query(`
    SELECT view
    FROM ui.view
    WHERE id='${id}'
    AND view->'meta'->>'owner' = '${userId}';
  `);
  const [{ view: currentView }] = rows;
  const now = Date.now();
  const view = JSON.stringify({
    ...updatedView,
    meta: {
      ...currentView.meta,
      timeUpdated: now,
    },
  });
  const { rowCount } = await dbPool.query(`
    UPDATE ui.view
    SET view='${view}'
    WHERE id='${id}'
    AND view->'meta'->>'owner' = '${userId}';
  `);

  if (rowCount > 0) {
    return {
      body: {
        message: `${id} updated`,
        success: true,
      },
    };
  } else {
    return {
      body: {
        message: `${id} not updated`,
        success: false,
      },
    };
  }
}
