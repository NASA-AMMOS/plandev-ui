import { base } from '$app/paths';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async () => {
  return json(
    { message: 'Logout successful', success: true },
    { headers: { 'set-cookie': `user=deleted; path=${base}/; expires=Thu, 01 Jan 1970 00:00:00 GMT` } },
  );
};
