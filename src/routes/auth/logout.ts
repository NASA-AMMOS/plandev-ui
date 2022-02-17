import type { RequestEvent } from '@sveltejs/kit';
import req from '../../utilities/requests';

export async function post(event: RequestEvent): Promise<LogoutResponse> {
  const { locals } = event;
  const { user } = locals;
  const { ssoToken = '' } = user;

  try {
    const logoutResponse: ReqLogoutResponse = await req.logout(ssoToken);
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
