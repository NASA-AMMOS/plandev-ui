console.log('The callback page handles OAuth2 callbacks from the identity provider.');

import * as auth from '$lib/server/auth';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * The login page produces a code verifier and an authorization URL.
 *
 * It is critical to implement the following security measures:
 *
 * 1. **State Parameter**: The state parameter is used to prevent CSRF attacks
 * 2. **PKCE**: The Proof Key for Code Exchange (PKCE) is used to enhance security in public clients.
 * 3. **Secure Cookies**: Cookies should be set with `httpOnly`, `secure`, and `sameSite` attributes to prevent XSS and CSRF attacks.
 * 4. **Validate iss, aud, and exp claims** to ensure it is issued by the expected identity provider and is not expired.
 *
 */
export const load: PageServerLoad = async ({ cookies, url }) => {
  console.debug('/oidc/callback load');

  const client = auth.Client.instance;
  const verifier = cookies.get('verifier');
  const code = url.searchParams.get('code');
  const expectedState = cookies.get('oidc_state');
  const returnedState = url.searchParams.get('state');
  const back = cookies.get('back') || '/';

  if (!code) {
    const errorMsg = url.searchParams.get('error_description') || 'No code provided';
    throw error(400, `Authorization server returned an error: ${errorMsg}`);
  }

  try {
    // Validate the state, verifier, and code.
    const problems = check(verifier, code, expectedState, returnedState);

    // Throw problems, if any exist.
    if (problems.size > 0) {
      // hmm... not quite right... throw in a try... it'll work... but... bleh.
      throw error(500, `Encountered the following problems with the callback state: \n${[...problems].join('\n')}`);
    }

    // Exchange the code for tokens.
    const tokens = await client.exchange(code, verifier as string);

    // Verify we got something back (verify that tokens is not undefined!)
    if (!tokens) {
      // hmm... not quite right... throw in a try... it'll work... but... bleh.
      throw error(500, `Call to OAuth2Client.validateAuthorizationCode returned undefined!`);
    }

    // Check token validity.
    const accessJwt = await auth.verify(tokens.accessToken());
    const idJwt = await auth.verify(tokens.accessToken());

    if (accessJwt && idJwt) {
      cookies.set('idToken', tokens.idToken(), { path: '/', httpOnly: false });
      cookies.set('accessToken', tokens.accessToken(), { path: '/', httpOnly: false });
      cookies.set('refreshToken', tokens.refreshToken(), { path: '/' });
      // Cleanup cookies used for the OIDC flow.
      cookies.delete('verifier', { path: '/' });
      cookies.delete('back', { path: '/' });
      cookies.delete('oidc_state', { path: '/' });
    } else {
      // again: hmm... not quite right... throw in a try... it'll work... but... bleh.
      throw error(500, `Failed to validate token ${tokens.accessToken()}`);
    }
  } catch (err) {
    throw error(500, `Failed to handle OIDC callback: ${err}`);
  }

  throw redirect(302, back);
};

// TODO: ??????
function check(
  verifier: string | undefined,
  code: string | null,
  expectedState: string | undefined,
  returnedState: string | null,
) {
  const problems = new Set<string>();
  void (expectedState || problems.add('Missing expected state'));
  void (returnedState || problems.add('Missing returned state'));
  void (expectedState === returnedState || problems.add('State parameter mismatch'));
  void (verifier || problems.add('Missing verifier'));
  void (code || problems.add('Missing code'));
  return problems;
}
