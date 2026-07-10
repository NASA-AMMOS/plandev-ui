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
  if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true') {
    if (browser) {
      // Pass reason as a query param so the server can persist it across the IdP roundtrip
      // (the IdP strips post_logout_redirect_uri query params, so a cookie is set in /oidc/logout
      // and consumed by +layout.server.ts when redirecting to /login).
      const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
      window.location.href = `${base}/oidc/logout${query}`;
    } else {
      console.error(
        `Logout triggered from server. NOTE - this is exceptional behavior and this logout handling exists to avoid a crash. Cited reason: ${reason}:`,
        reason,
      );

      throw new Error(`Logout triggered server-side.\nCited Reason: ${reason}.`);
    }
  } else {
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
}
