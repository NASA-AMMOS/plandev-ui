import { base } from '$app/paths';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { computeRolesFromJWT } from '../../../hooks.server';
import type { ChangeUserRoleRequestBody } from '../../../types/auth';

export const POST: RequestHandler = async event => {
  const body: ChangeUserRoleRequestBody = await event.request.json();
  const { role } = body;
  if (!event.locals.user) {
    return json({ message: 'User not found', success: false, user: null });
  }
  const updatedUser = await computeRolesFromJWT(event.locals.user, role);
  return json(
    { message: '', success: true, user: updatedUser },
    { headers: { 'set-cookie': `activeRole=${role}; Path=${base}/` } },
  );
};
