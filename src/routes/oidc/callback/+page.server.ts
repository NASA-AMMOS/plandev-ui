import * as auth from '$lib/server/oidc';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * The callback page exchanges the authorization code for tokens.
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

  const client = await auth.Client.instance;
  const verifier = cookies.get('verifier');
  const code = url.searchParams.get('code');
  const expectedState = cookies.get('oidc_state');
  const returnedState = url.searchParams.get('state');
  const back = cookies.get('back') || '/';

  // These cookies are only used during this step of the OIDC flow, if the exchange fails for
  // any reason, the flow will need to be reinitiated. So they are unconditionally deleted.
  cookies.delete('verifier', { path: '/' });
  cookies.delete('back', { path: '/' });
  cookies.delete('oidc_state', { path: '/' });

  if (!code) {
    const errorMsg = url.searchParams.get('error_description') || 'No code provided';
    const message = `Authorization server returned an error: ${errorMsg}`;
    error(401, message);
  }

  try {
    const problems = check(verifier, code, expectedState, returnedState);
    if (problems.size > 0) {
      throw new Error(`Encountered the following problems with the callback state: \n${[...problems].join('\n')}`);
    }

    const tokens = await client.exchange(code, verifier as string);
    if (!tokens) {
      throw new Error(`Could not exchange authorization code for tokens.`);
    }

    const success = await auth.updateWithNewTokens(cookies, tokens);
    if (!success) {
      throw new Error(`Failed to validate token ${tokens.accessToken()}`);
    }
  } catch (err) {
    console.error(err);
    const message = `Failed to handle OIDC callback: ${err}`;
    error(401, message);
  }

  redirect(302, back);
};

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
