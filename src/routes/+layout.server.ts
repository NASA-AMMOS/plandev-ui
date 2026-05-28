import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import { enforce } from '../lib/server/oidc';
import { userIsDefined } from '../lib/server/rule';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, locals, url }) => {
  const nonProtectedPage: boolean =
    url.pathname.startsWith(`${base}/error`) ||
    url.pathname.startsWith(`${base}/oidc`) ||
    url.pathname.startsWith(`${base}/login`) ||
    url.pathname.startsWith(`${base}/auth`);

  const buildLoginRedirect = (): string => {
    const redirectTo = encodeURIComponent(url.pathname + url.search);
    // Consume the one-shot logoutReason cookie set by /oidc/logout to surface why the user was bounced.
    const reason = cookies.get('logoutReason');
    if (reason) {
      cookies.delete('logoutReason', { path: '/' });
    }
    const reasonParam = reason ? `&reason=${encodeURIComponent(reason)}` : '';
    return `${base}/login?redirectTo=${redirectTo}${reasonParam}`;
  };

  if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true' && !nonProtectedPage) {
    try {
      enforce(locals?.user, userIsDefined);
    } catch {
      redirect(302, buildLoginRedirect());
    }
  } else if (!nonProtectedPage && !locals.user) {
    redirect(302, buildLoginRedirect());
  }
  return { user: locals.user };
};
