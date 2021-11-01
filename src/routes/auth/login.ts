import type { Request } from '@sveltejs/kit';
import type { ResponseHeaders } from '@sveltejs/kit/types/helper';
import type { LoginResponse, User } from '../../types';
import { reqLogin } from '../../utilities/requests';

/* Types. */

export type LoginPostRequestBody = {
  password: string;
  username: string;
};

export type LoginPostResponseBody = {
  message?: string;
  success: boolean;
  user?: User;
};

export type LoginPostResponse = {
  body?: LoginPostResponseBody;
  headers?: ResponseHeaders;
  status?: number;
};

/* Endpoints. */

export async function post(
  req: Request<Record<string, any>, LoginPostRequestBody>,
): Promise<LoginPostResponse> {
  const { body } = req;
  const { password, username } = body;

  try {
    const loginResponse: LoginResponse = await reqLogin(username, password);
    const { message, ssoToken, success, username: id } = loginResponse;

    if (success) {
      const user: User = { id, ssoToken };
      const userStr = JSON.stringify(user);
      const userCookie = Buffer.from(userStr).toString('base64');

      return {
        body: {
          success: true,
          user,
        },
        headers: {
          'set-cookie': `user=${userCookie}; Path=/`,
        },
      };
    } else {
      return {
        body: {
          message,
          success: false,
        },
      };
    }
  } catch (e) {
    console.log(e);
    return {
      body: {
        message: e.message,
        success: false,
      },
    };
  }
}
