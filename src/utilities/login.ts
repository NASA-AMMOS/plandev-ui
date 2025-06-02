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
    const response = await fetch(`${base}/auth/logout`, { headers: {
			'Content-Type': 'application/json'
		}, method: 'POST' }).then(response => response.json());

    if (typeof response.success === 'string') { // a Keycloak-auth specific case (or any OAuth involving the need to redirect to a logout page)
      window.location.href = response.success; 
    }
    else {
      if (env.PUBLIC_AUTH_SSO_ENABLED === 'true') { // CAM or other auth that doesn't require redirection
        // hooks will handle SSO redirect
        await goto(base, { invalidateAll: true });
      } else {
        await goto(`${base}/login${reason ? '?reason=' + reason : ''}`, { invalidateAll: true });
      }
    }
  }
}
