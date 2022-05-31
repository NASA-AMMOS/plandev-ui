import type { RequestHandler } from '@sveltejs/kit';
import effects from '../../utilities/effects';

export const post: RequestHandler = async event => {
  const { locals } = event;
  const { user } = locals;
  const { ssoToken = '' } = user;

  try {
    const logoutResponse: ReqLogoutResponse = await effects.logout(ssoToken);
    const { message, success } = logoutResponse;

    if (success) {
      return {
        body: {
          message,
          success: true,
        },
        headers: {
          'set-cookie': 'user=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT',
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
};
