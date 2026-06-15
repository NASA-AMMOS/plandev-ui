import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import type { User } from '../types/app';
import { hasNoAuthorization } from './permissions';

export function shouldRedirectToLogin(user: User | null) {
  return !user || hasNoAuthorization(user);
}

export async function logout(reason?: string) {
  if (browser) {
    await fetch(`${base}/auth/logout`, { method: 'POST' });
    if (env.PUBLIC_AUTH_SSO_ENABLED === 'true') {
      // Full-page navigation (NOT goto): with SSO the post-logout request is redirected to
      // the external login UI (by the CAM web agent and/or the server hook). A goto() makes
      // that request as a background fetch, which silently follows a same-origin redirect and
      // discards the login page instead of navigating (logging "expected json, got html"),
      // stranding the user in a dead app. A top-level navigation follows it regardless of origin.
      window.location.assign(`${base}/`);
    } else {
      await goto(`${base}/login${reason ? '?reason=' + reason : ''}`, { invalidateAll: true });
    }
  }
}
