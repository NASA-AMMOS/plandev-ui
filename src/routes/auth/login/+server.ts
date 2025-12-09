import { dev } from '$app/environment';
import { extractClaims } from '$lib/server/oidc';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { jwtDecode } from 'jwt-decode';
import type { BaseUser } from '../../../types/app';
import type { LoginRequestBody, ReqAuthResponse } from '../../../types/auth';
import effects from '../../../utilities/effects';

export const POST: RequestHandler = async event => {
  const body: LoginRequestBody = await event.request.json();
  const { password, username } = body;

  try {
    const loginResponse: ReqAuthResponse = await effects.login(username, password);
    const { message, success, token } = loginResponse;

    if (success && token) {
      const user: BaseUser = { id: username, token };
      const userStr = JSON.stringify(user);
      const userCookie = Buffer.from(userStr).toString('base64');
      const decodedToken = jwtDecode(user.token) as Record<string, unknown>;
      const claims = extractClaims(decodedToken);

      event.cookies.set('activeRole', claims.defaultRole, { httpOnly: false, path: '/', sameSite: 'lax', secure: !dev });
      event.cookies.set('user', userCookie, { httpOnly: false, path: '/', sameSite: 'lax', secure: !dev });
      return json({ success: true, user });
    } else {
      return json({ message, success: false });
    }
  } catch (e) {
    console.log(e);
    return json({ message: (e as Error).message, success: false });
  }
};
