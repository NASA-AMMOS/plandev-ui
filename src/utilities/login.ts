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
