import cookie from 'cookie';
import { jwtDecode, type JwtPayload } from 'jwt-decode';
import { derived, get, writable } from 'svelte/store';

export const accessToken = writable<JwtPayload | null>(null);

export const idToken = writable<JwtPayload | null>(null);

type CookieChanged = {
  name: string;
  value: string;
  expires: Date;
  domain: string;
};

type CookieDeleted = {
  name: string;
  domain: string;
};

interface CookieChangeEvent extends Event {
  changed: CookieChanged[];
  deleted: CookieDeleted[];
}

type CookieStore = {
  addEventListener: Window['addEventListener'];
  removeEventListener: Window['removeEventListener'];
};

declare global {
  interface Window {
    cookieStore: CookieStore;
    addEventListener(type: string, listener: (this: Window, ev: CookieChangeEvent) => void, useCapture?: boolean): void;
  }
}

export function cookieStoreListener() {
  if (window && 'cookieStore' in window) {
    window.cookieStore.addEventListener('change', handleCookieStoreChange);
    console.log('Added cookie store change listener.');
  } else {
    console.error('Cookie store is not available in this environment. It is *required* for automatic refresh of JWT.');
  }

  // Set the initial values of the access and id tokens from cookies.
  const tokens = cookie.parse(document.cookie, { decode: jwtDecode }) as any;
  accessToken.set(tokens.accessToken ?? null);
  idToken.set(tokens.idToken ?? null);

  // Track the unsubscription function to remove the cookie store change listener.
  const unsubscribe = delay.subscribe(value => {
    if (value) {
      console.log(`Delay changed to ${value}ms`);
      prior = reschedule(refresh, value, prior);
    }
  });

  // Return a cleanup function to remove the cookie store change listener
  // and unsubscribe from the delay store.
  return () => {
    console.log('Removing cookie store change listener.');
    window.cookieStore.removeEventListener('change', handleCookieStoreChange);
    unsubscribe();
  };
}

export const expiresAt = derived(accessToken, $accessToken => {
  return $accessToken?.exp ? new Date($accessToken?.exp * 1000) : null;
});

export const refreshAt = derived(expiresAt, $expiresAt => {
  return $expiresAt ? new Date($expiresAt.getTime() - 10 * 1000) : null;
});

export const expired = derived(expiresAt, $expiresAt => {
  return $expiresAt && $expiresAt < new Date();
});

export const delay = derived(refreshAt, $refreshAt => {
  const $expiresAt = get(expiresAt);
  if ($expiresAt && $refreshAt && $refreshAt > new Date()) {
    return Math.max(0, $refreshAt.getTime() - Date.now());
  } else {
    return 0;
  }
});

let prior: number | null = null;

/// Private Helpers.

export async function refresh(): Promise<void> {
  console.log('Refreshing tokens...');
  const res = await fetch('/oidc/refresh', { method: 'POST', credentials: 'include' });
  if (res.ok) {
    console.info('Access token refresh succeeded.');
  } else {
    console.error('Access token refresh failed, refresh token is probably expired.');
    window.location.href = '/oidc/login';
  }
}

function reschedule(fn: () => Promise<void>, delay: number, prior: number | null): any {
  if (prior) {
    console.log(`Clearing previous timeout. ${prior}`);
    clearTimeout(prior);
  }
  console.log(`Scheduling ${fn.name} in ${delay}ms`);
  return setTimeout(() => {
    fn();
  }, delay);
}

/**
 * Handles changes and deletions to the cookie store.
 *
 * @param event: CookieChangeEvent - The event containing the changed or deleted cookies.
 */
const handleCookieStoreChange = ((event: CookieChangeEvent) => {
  console.log(`Cookie store change detected.`, event);
  event.changed.forEach(({ name, value }) => {
    console.log(`Cookie changed: ${name}`);
    if (name === 'accessToken') {
      accessToken.set(jwtDecode(value));
    }
    if (name === 'idToken') {
      idToken.set(jwtDecode(value));
    }
  });
  event.deleted.forEach(({ name }) => {
    console.log(`Cookie deleted`);
    if (name === 'accessToken') {
      accessToken.set(null);
    }
    if (name === 'idToken') {
      idToken.set(null);
    }
  });
}) as (this: Window, ev: Event) => any;
