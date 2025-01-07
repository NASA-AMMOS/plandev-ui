import { Cookie } from '@playwright/test';

export function getUserCookieValue(cookies: Cookie[]): string | undefined {
  for (const cookie of cookies) {
    if (cookie.name === 'user') {
      return JSON.parse(atob(cookie.value)).token;
    }
  }

  return undefined;
}
