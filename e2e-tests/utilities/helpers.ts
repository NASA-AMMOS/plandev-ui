import { Cookie } from '@playwright/test';

export function getUserCookieValue(cookies: Cookie[]): string | undefined {
  if (process.env.PUBLIC_AUTH_OIDC_ENABLED === 'true') {
    return cookies.find(cookie => cookie.name === 'accessToken')?.value;
  }
  for (const cookie of cookies) {
    if (cookie.name === 'user') {
      return JSON.parse(atob(cookie.value)).token;
    }
  }

  return undefined;
}
