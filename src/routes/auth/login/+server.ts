import { base } from '$app/paths';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { jwtDecode } from 'jwt-decode';
import type { BaseUser, ParsedUserToken } from '../../../types/app';
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
      const parsedUserToken: ParsedUserToken = jwtDecode(user.token);
      const defaultRole = parsedUserToken['https://hasura.io/jwt/claims']['x-hasura-default-role'];

      return json(
        { success: true, user },
        { headers: { 'set-cookie': `activeRole=${defaultRole}; path=${base}/,user=${userCookie}; Path=${base}/` } },
      );
    } else {
      return json({ message, success: false });
    }
  } catch (e) {
    console.log(e);
    return json({ message: (e as Error).message, success: false });
  }
};
