import type { CamApiOptions, LogoutResponse } from '@gov.nasa.jpl.aerie/cam';
import { CamApi } from '@gov.nasa.jpl.aerie/cam';
import type { Request } from '@sveltejs/kit';
import type { ResponseHeaders } from '@sveltejs/kit/types/helper';
import { CAM_API_URL, CAM_ENABLED } from '../../env';

export type LogoutPostResponseBody = {
  message: string;
  success: boolean;
};
export type LogoutPostResponse = {
  body?: LogoutPostResponseBody;
  headers?: ResponseHeaders;
  status?: number;
};

export async function post(
  req: Request<Record<string, any>, unknown>,
): Promise<LogoutPostResponse> {
  const camOptions: CamApiOptions = {
    apiUrl: CAM_API_URL,
    enabled: CAM_ENABLED,
  };
  const camApi = new CamApi(camOptions);
  const { locals } = req;
  const { user } = locals;
  const { ssoToken = '' } = user;

  try {
    const logoutResponse: LogoutResponse = await camApi.logout(ssoToken);
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
