import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import type { User } from '../types/app';
import { hasNoAuthorization } from './permissions';

export function shouldRedirectToLogin(user: User | null) {
  return !user || hasNoAuthorization(user);
}

export async function refresh(): Promise<void> {
  console.log('Refreshing tokens...');
  const res = await fetch('/oidc/refresh', { credentials: 'include', method: 'POST' });
  if (res.ok) {
    console.info('Access token refresh succeeded.');
  } else {
    console.error('Access token refresh failed, refresh token is probably expired.');
    window.location.href = '/oidc/login';
  }
}

export async function logout(reason?: string) {
  if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true') {
    if (browser) {
      goto(`${base}/oidc/logout`);
    } else {
      console.log(
        `Logging out from server. NOTE - this is exceptional behavior and this logout handling exists to avoid a crash. Cited reason: ${reason}`,
      );
      const res = await fetch('/oidc/logout', { credentials: 'include', method: 'POST' });
      const redirectURI = (await res.json()).redirectURI;
      console.log(`Redirecting now to: ${redirectURI}...`);
      redirect(302, redirectURI);
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
