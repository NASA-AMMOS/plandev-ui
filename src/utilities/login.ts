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
        // hooks will handle SSO redirect
        await goto(base, { invalidateAll: true });
      } else {
        await goto(`${base}/login${reason ? '?reason=' + reason : ''}`, { invalidateAll: true });
      }
    }
  }
}
