import { dev } from '$app/environment';
import * as auth from '$lib/server/oidc';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const shortLivedCookieOptions = {
  httpOnly: true,
  maxAge: 300,
  path: '/',
  sameSite: 'lax',
  secure: !dev, // Only require secure in production (HTTPS)
} as const;

/**
 * The login page produces a code verifier and an authorization URL.
 */
export const load: PageServerLoad = async ({ cookies, url }) => {
  console.debug('/oidc/login load');

  // Other pages in this app may redirect to the login page with a `back` query parameter.
  // This allows the login page to redirect back to the original page after a successful login.
  // If no `back` parameter is provided, it defaults to the root path.
  //
  // SECURITY: Validate the back parameter to prevent open redirect attacks.
  // Only allow relative paths that start with '/' but not '//' (protocol-relative URLs).
  // Examples of rejected values: 'https://evil.com', '//evil.com', 'javascript:alert(1)'
  const rawBack = url.searchParams.get('back') || '/';
  const back = rawBack.startsWith('/') && !rawBack.startsWith('//') ? rawBack : '/';
  cookies.set('back', back, {
    httpOnly: true,
    path: '/',
    secure: !dev,
  });

  const client = await auth.Client.instance;
  const { verifier, state, nonce, authorizationUrl } = client.createAuthorizationURLWithPKCE();
  cookies.set('verifier', verifier, shortLivedCookieOptions);
  cookies.set('oidc_state', state, shortLivedCookieOptions);
  cookies.set('oidc_nonce', nonce, shortLivedCookieOptions);
  redirect(302, authorizationUrl.toString());
};
