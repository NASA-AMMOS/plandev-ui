import { dev } from '$app/environment';
import { base } from '$app/paths';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import type { CookieSerializeOptions } from 'cookie';
import type { ChangeUserRoleRequestBody } from '../../../types/auth';
import { computeRolesFromJWT } from '../../../utilities/auth';

export const POST: RequestHandler = async event => {
  const body: ChangeUserRoleRequestBody = await event.request.json();
  const { role } = body;

  if (!event.locals.user) {
    return json({ message: 'User not found', success: false, user: null }, { status: 401 });
  }

  // Validate that the requested role is in the user's allowed roles
  if (!event.locals.user.allowedRoles.includes(role)) {
    return json(
      { message: `Role '${role}' is not permitted for this user`, success: false, user: null },
      { status: 403 },
    );
  }

  const updatedUser = await computeRolesFromJWT(event.locals.user, role);

  // Use event.cookies.set() for consistent cookie handling with proper security attributes
  const cookieOpts: CookieSerializeOptions & { path: string } = {
    httpOnly: false, // Must be accessible to client JS for role display
    path: `${base}/`,
    sameSite: 'lax', // Protects against CSRF while allowing normal navigation
    secure: !dev, // Only send over HTTPS in production
  };
  event.cookies.set('activeRole', role, cookieOpts);

  return json({ message: '', success: true, user: updatedUser });
};
