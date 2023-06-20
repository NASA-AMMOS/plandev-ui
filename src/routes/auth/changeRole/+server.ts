import { base } from '$app/paths';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import jwtDecode from 'jwt-decode';
import type { BaseUser, ParsedUserToken } from '../../../types/app';
import type { ChangeUserRoleRequestBody, ReqAuthResponse } from '../../../types/auth';
import effects from '../../../utilities/effects';

export const POST: RequestHandler = async event => {
  const body: ChangeUserRoleRequestBody = await event.request.json();
  const { role } = body;
  const { locals } = event;
  const { user } = locals;

  try {
    const authResponse: ReqAuthResponse = await effects.changeUserRole(role, user);
    const { message, success, token: newToken } = authResponse;

    if (success && newToken) {
      const decodedToken: ParsedUserToken = jwtDecode(newToken);
      const user: BaseUser = { id: decodedToken.username, token: newToken };
      const userStr = JSON.stringify(user);
      const userCookie = Buffer.from(userStr).toString('base64');

      return json({ success: true, user }, { headers: { 'set-cookie': `user=${userCookie}; Path=${base}/` } });
    } else {
      return json({ message, success: false });
    }
  } catch (e) {
    return json({ message: (e as Error).message, success: false });
  }
};
