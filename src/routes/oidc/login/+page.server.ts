import * as auth from '$lib/server/oidc';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const shortLivedCookieOptions = {
  httpOnly: true,
  maxAge: 300,
  path: '/',
  sameSite: 'lax',
  secure: true,
} as const;

/**
 * The login page produces a code verifier and an authorization URL.
 */
export const load: PageServerLoad = async ({ cookies, url }) => {
  console.debug('/oidc/login load');

  // Other pages in this app may redirect to the login page with a `back` query parameter.
  // This allows the login page to redirect back to the original page after a successful login.
  // If no `back` parameter is provided, it defaults to the root path.
  const back = url.searchParams.get('back') || '/';
  cookies.set('back', back, {
    httpOnly: true,
    path: '/',
  });

  const client = await auth.Client.instance;
  const { verifier, state, nonce, authorizationUrl } = client.createAuthorizationURLWithPKCE();
  cookies.set('verifier', verifier, shortLivedCookieOptions);
  cookies.set('oidc_state', state, shortLivedCookieOptions);
  cookies.set('oidc_nonce', nonce, shortLivedCookieOptions);
  redirect(302, authorizationUrl.toString());
};
