import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import type { User } from '../types/app';
import { hasNoAuthorization } from './permissions';

export function isLoginEnabled() {
  // if PUBLIC_LOGIN_PAGE is not explicitly set to "disabled", then assume it is enabled
  return env.PUBLIC_LOGIN_PAGE !== 'disabled';
}

export function shouldRedirectToLogin(user: User | null) {
  return isLoginEnabled() && (!user || hasNoAuthorization(user));
}

export async function logout(reason?: string) {
  if (browser) {
    await fetch(`${base}/auth/logout`, { method: 'POST' });
    await goto(`${base}/login${reason ? '?reason=' + reason : ''}`, { invalidateAll: true });
  }
}
