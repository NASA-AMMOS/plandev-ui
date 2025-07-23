import { base } from '$app/paths';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import type { ChangeUserRoleRequestBody } from '../../../types/auth';

export const POST: RequestHandler = async event => {
  const body: ChangeUserRoleRequestBody = await event.request.json();
  const { role } = body;
  return json({ success: true }, { headers: { 'set-cookie': `activeRole=${role}; Path=${base}/` } });
};
