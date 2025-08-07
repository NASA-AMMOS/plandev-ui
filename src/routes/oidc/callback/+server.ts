import * as auth from '$lib/server/oidc';
import { redirect } from '@sveltejs/kit';

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
export const GET = async ({ cookies, url }) => {
  console.debug('/oidc/callback load');

  const client = auth.Client.instance;
  const verifier = cookies.get('verifier');
  const code = url.searchParams.get('code');
  const expectedState = cookies.get('oidc_state');
  const returnedState = url.searchParams.get('state');
  const back = cookies.get('back') || '/';

  if (!code) {
    const errorMsg = url.searchParams.get('error_description') || 'No code provided';
    const code = 500;
    const message = encodeURI(`Authorization server returned an error: ${errorMsg}`);
    throw redirect(303, `/error-redirect?code=${code}&message=${message}`);
  }

  try {
    // Validate the state, verifier, and code.
    const problems = check(verifier, code, expectedState, returnedState);

    // Throw problems, if any exist.
    if (problems.size > 0) {
      // hmm... not quite right... throw in a try... it'll work... but... bleh.
      const code = 500;
      const message = encodeURI(
        `Encountered the following problems with the callback state: \n${[...problems].join('\n')}`,
      );
      throw redirect(303, `/error-redirect?code=${code}&message=${message}`);
    }

    // Exchange the code for tokens.
    const tokens = await client.exchange(code, verifier as string);

    // Verify we got something back (verify that tokens is not undefined!)
    if (!tokens) {
      // hmm... not quite right... throw in a try... it'll work... but... bleh.
      const code = 500;
      const message = encodeURI(`Call to OAuth2Client.validateAuthorizationCode returned undefined!`);
      throw redirect(303, `/error-redirect?code=${code}&message=${message}`);
    }

    if (await auth.updateWithNewTokens(cookies, tokens)) {
      // Cleanup cookies used for the OIDC flow.
      cookies.delete('verifier', { path: '/' });
      cookies.delete('back', { path: '/' });
      cookies.delete('oidc_state', { path: '/' });
    } else {
      // again: hmm... not quite right... throw in a try... it'll work... but... bleh.
      const code = 500;
      const message = encodeURI(`Failed to validate token ${tokens.accessToken()}`);
      throw redirect(303, `/error-redirect?code=${code}&message=${message}`);
    }
  } catch (err) {
    const code = 500;
    const message = encodeURI(`Failed to handle OIDC callback: ${JSON.stringify(err)}`);
    throw redirect(303, `/error-redirect?code=${code}&message=${message}`);
  }

  throw redirect(302, back);
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
