import type { Request } from '@sveltejs/kit';
import type { ResponseHeaders } from '@sveltejs/kit/types/helper';
import type { LogoutResponse } from '../../types';
import { reqLogout } from '../../utilities/requests';

/* Types. */

export type LogoutPostResponseBody = {
  message: string;
  success: boolean;
};

export type LogoutPostResponse = {
  body?: LogoutPostResponseBody;
  headers?: ResponseHeaders;
  status?: number;
};

/* Endpoints. */

export async function post(
  req: Request<Record<string, any>, unknown>,
): Promise<LogoutPostResponse> {
  const { locals } = req;
  const { user } = locals;
  const { ssoToken = '' } = user;

  try {
    const logoutResponse: LogoutResponse = await reqLogout(ssoToken);
    const { message, success } = logoutResponse;

    if (success) {
      return {
        body: {
          message,
          success: true,
        },
        headers: {
          'set-cookie':
            'user=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT',
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
