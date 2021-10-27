import type { CamApiOptions, LoginResponse } from '@gov.nasa.jpl.aerie/cam';
import { CamApi } from '@gov.nasa.jpl.aerie/cam';
import type { Request } from '@sveltejs/kit';
import type { ResponseHeaders } from '@sveltejs/kit/types/helper';
import { get } from 'svelte/store';
import { config } from '../../stores/config';
import type { User } from '../../types';

export type LoginPostRequestBody = { password: string; username: string };
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

export async function post(
  req: Request<Record<string, any>, LoginPostRequestBody>,
): Promise<LoginPostResponse> {
  const { CAM_API_URL, CAM_ENABLED } = get(config);
  const camOptions: CamApiOptions = {
    apiUrl: CAM_API_URL,
    enabled: CAM_ENABLED,
  };
  const camApi = new CamApi(camOptions);
  const { body } = req;
  const { password, username } = body;

  try {
    const loginResponse: LoginResponse = await camApi.login(username, password);
    const { message, ssoCookieValue: ssoToken, success } = loginResponse;

    if (success) {
      const { fullName, userId } = await camApi.user(ssoToken);
      const user: User = { fullName, ssoToken, userId };
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
