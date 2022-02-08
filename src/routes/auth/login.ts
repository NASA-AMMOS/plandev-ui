import type { RequestEvent } from '@sveltejs/kit';
import { reqLogin } from '../../utilities/requests';

export async function post(event: RequestEvent): Promise<LoginResponse> {
  const body: LoginRequestBody = await event.request.json();
  const { password, username } = body;

  try {
    const loginResponse: ReqLoginResponse = await reqLogin(username, password);
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
