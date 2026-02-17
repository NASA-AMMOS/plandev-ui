import { jwtDecode } from 'jwt-decode';
import { derived, get, writable, type Readable } from 'svelte/store';
import { restartSharedClient } from '../../stores/gqlClient';
import { getCookieValue } from '../../utilities/browser';
import type { MaybeToken } from '../types/oidc';

type CookieChanged = {
  domain: string;
  expires: Date;
  name: string;
  value: string;
};

type CookieDeleted = {
  domain: string;
  name: string;
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
  }
}

// Store for the current access token (read from cookie)
// Used only for computing refresh timing, not for user state
const accessToken = writable<string | null>(null);

// Initialize from cookie on load
const initialToken = getCookieValue('accessToken');
if (initialToken) {
  accessToken.set(initialToken);
}

export function cookieStoreListener() {
  if (window && 'cookieStore' in window) {
    window.cookieStore.addEventListener('change', handleCookieStoreChange);
    console.debug('Added cookie store change listener.');
  } else {
    console.error('Cookie store is not available in this environment. It is *required* for automatic refresh of JWT.');
  }

  // Delay is a `derived` value from the access token.
  // Whenever the delay changes, any prior timeout is cancelled and a new timeout
  // is created (using the new value of delay).
  const unsubscribe = delay.subscribe(value => {
    if (value) {
      console.debug(`Scheduling token refresh in ${value}ms`);
      prior = reschedule(refresh, value, prior);
    }
  });

  // Return a cleanup function to remove the cookie store change listener
  // and unsubscribe from the delay store.
  const cleanup = () => {
    console.debug('Removing cookie store change listener.');
    if ('cookieStore' in window) {
      window.cookieStore.removeEventListener('change', handleCookieStoreChange);
    }
    unsubscribe();
    if (prior) {
      clearTimeout(prior);
      prior = null;
    }
  };

  // Store on window so HMR module re-evaluation can find and clean up the old listener
  (window as any).__oidcCookieCleanup = cleanup;

  return cleanup;
}

// The decoded access token contains a timestamp that indicates when it will expire.
export const accessTokenDecoded: Readable<MaybeToken> = derived(accessToken, $accessToken => {
  if ($accessToken) {
    try {
      return jwtDecode($accessToken) as MaybeToken;
    } catch {
      return null;
    }
  }
  return null;
});

// We convert the expiration time to a javascript date value.
export const expiresAt = derived(accessTokenDecoded, $accessTokenDecoded => {
  return $accessTokenDecoded?.exp ? new Date($accessTokenDecoded?.exp * 1000) : null;
});

// We calculate a refresh time that is 10 seconds before the expiration time.
export const refreshAt = derived(expiresAt, $expiresAt => {
  return $expiresAt ? new Date($expiresAt.getTime() - 10 * 1000) : null;
});

// The delay is used to schedule a timeout.
export const delay = derived(refreshAt, $refreshAt => {
  const $expiresAt = get(expiresAt);
  if ($expiresAt && $refreshAt && $refreshAt > new Date()) {
    return Math.max(0, $refreshAt.getTime() - Date.now());
  } else {
    return 0;
  }
});

// This number is the result of calling setTimeout.
let prior: number | null = null;

/// Private Helpers.

export async function refresh(): Promise<void> {
  console.debug('Refreshing tokens...');
  const res = await fetch('/oidc/refresh', { credentials: 'include', method: 'POST' });
  if (res.ok) {
    console.debug('Access token refresh succeeded.');
  } else {
    // Don't log or include response body - it may contain sensitive error details
    console.error('Access token refresh failed, refresh token is probably expired.');
    throw new Error('Token refresh failed');
  }
}

function reschedule(fn: () => Promise<void>, delay: number, previousTimeout: number | null): any {
  if (previousTimeout) {
    console.debug(`Clearing previous timeout.`);
    clearTimeout(previousTimeout);
  }
  console.debug(`Scheduling ${fn.name} in ${delay}ms`);
  return setTimeout(async () => {
    try {
      await fn();
    } catch (err) {
      // Only log error message, not full object (may contain sensitive data)
      console.error('Error in scheduled refresh:', err instanceof Error ? err.message : 'Unknown error');
      // Retry after 5 seconds — network may have been temporarily unavailable.
      // When it succeeds, the cookie update triggers the normal delay-based scheduling.
      console.debug('Scheduling token refresh retry in 5000ms');
      prior = reschedule(fn, 5000, prior);
    }
  }, delay);
}

/**
 * Handles changes and deletions to the cookie store.
 *
 * Token refresh: Updates accessToken store, dispatches event to update user store,
 * and restarts WebSocket. While Hasura validates JWT at connection_init, it also
 * monitors expiration and kills connections when tokens expire.
 *
 * Role change: Handled by Nav.svelte → /auth/changeRole → user store update →
 * +layout.svelte reactive block → WebSocket restart.
 */
const handleCookieStoreChange = async (ev: Event) => {
  const event = ev as CookieChangeEvent;

  // Only log cookie names, never values (which may contain tokens)
  console.debug(
    'Cookie store change detected:',
    'changed:',
    event.changed.map(c => c.name),
    'deleted:',
    event.deleted.map(c => c.name),
  );

  let tokenRefreshed = false;

  event.changed.forEach(({ name, value }) => {
    if (name === 'accessToken') {
      // Update internal store for refresh timing
      accessToken.set(value);
      tokenRefreshed = true;

      // Dispatch event so the layout can update the user store with the fresh token
      window.dispatchEvent(new CustomEvent('oidc-token-refreshed', { detail: { token: value } }));
    }
    // Note: activeRole changes are handled by Nav.svelte which updates the user store
    // directly after receiving the updated user from the server. The +layout.svelte
    // reactive statement then detects the role change and restarts the WebSocket.
  });

  if (tokenRefreshed) {
    // Restart WebSocket to pick up new credentials. While Hasura validates JWT only
    // at connection_init, it ALSO monitors token expiration and closes connections
    // when JWTs expire (observed in Hasura logs: "Could not verify JWT: JWTExpired").
    // Restarting proactively with the fresh token prevents this abrupt 1006 close.
    console.debug('Token refreshed, restarting WebSocket with fresh credentials.');
    restartSharedClient();
  }
};

// HMR resilience: when this module is re-evaluated during HMR, clean up the old listener
// (which references stale handleCookieStoreChange closure) and immediately re-establish
// with fresh module references. This keeps token refresh working during HMR.
// Only re-establish if there's a valid accessToken (user is authenticated).
if (typeof window !== 'undefined') {
  const prevCleanup = (window as any).__oidcCookieCleanup as (() => void) | undefined;
  if (prevCleanup) {
    console.debug('HMR: cleaning up old OIDC listeners.');
    prevCleanup();
    // Only re-establish listener if we have a valid token (user is authenticated)
    if (getCookieValue('accessToken')) {
      console.debug('HMR: re-establishing OIDC listeners with fresh module references.');
      cookieStoreListener();
    }
  }
}
