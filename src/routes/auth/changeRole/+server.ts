import { base } from '$app/paths';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import type { User } from '../../../types/app';
import type { ChangeUserRoleRequestBody } from '../../../types/auth';
import effects from '../../../utilities/effects';

export const POST: RequestHandler = async event => {
  const body: ChangeUserRoleRequestBody = await event.request.json();
  const { role } = body;
  if (!event.locals.user) {
    return json({ message: 'User not found', success: false, user: null });
  }
  const updatedUser: User = { ...event.locals.user, activeRole: role };
  const permissibleQueries = await effects.getUserQueries(updatedUser);
  const rolePermissions = await effects.getRolePermissions(updatedUser);
  updatedUser.permissibleQueries = permissibleQueries;
  updatedUser.rolePermissions = rolePermissions;
  return json(
    { message: '', success: true, user: updatedUser },
    { headers: { 'set-cookie': `activeRole=${role}; Path=${base}/` } },
  );
};
