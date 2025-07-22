import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';

const shortLivedCookieOptions = {
	httpOnly: true,
	path: '/',
	secure: true,
	sameSite: 'lax',
	maxAge: 300
} as const;

/**
 * The login page produces a code verifier and an authorization URL.
 */
export const load: PageServerLoad = async ({ cookies, url }) => {
	console.debug('/auth/login load');

	// Other pages in this app may redirect to the login page with a `back` query parameter.
	// This allows the login page to redirect back to the original page after a successful login.
	// If no `back` parameter is provided, it defaults to the root path.
	const back = url.searchParams.get('back') || '/';
	cookies.set('back', back, {
		httpOnly: true,
		path: '/'
	});

	const client = auth.Client.instance;;
	const { verifier, state, authorizationUrl } = client.createAuthorizationURLWithPKCE();
	cookies.set('verifier', verifier, shortLivedCookieOptions);
	cookies.set('oidc_state', state, shortLivedCookieOptions);
	return redirect(302, authorizationUrl.toString());
};
