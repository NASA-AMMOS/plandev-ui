import { base } from '$app/paths';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import type { ReqLogoutResponse } from '../../../types/auth';
import effects from '../../../utilities/effects';

export const POST: RequestHandler = async event => {
  const { locals } = event;
  const { user } = locals;
  const { ssoToken = '' } = user;

  try {
    const logoutResponse: ReqLogoutResponse = await effects.logout(ssoToken);
    const { message, success } = logoutResponse;

    if (success) {
      return json(
        { message, success: true },
        { headers: { 'set-cookie': `user=deleted; path=${base}/; expires=Thu, 01 Jan 1970 00:00:00 GMT` } },
      );
    } else {
      return json({ message, success: false });
    }
  } catch (e) {
    console.log(e);
    return json({ message: e.message, success: false });
  }
};
