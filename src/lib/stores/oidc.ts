import { jwtDecode } from 'jwt-decode';
import { derived, get, type Readable } from 'svelte/store';
import type { BaseUser, User } from '../../types/app';
import { computeRolesFromJWT } from '../../utilities/auth';
import { showFailureToast } from '../../utilities/toast';
import type { MaybeToken } from '../types/oidc';
import { userStore } from './auth';

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

  // Delay is a `derived` value, ultimately from the user store... (see below).
  // Whenever the delay changes, any prior timeout is cancelled and a new timeout
  // is created (using the new value of delay).
  //
  // We track an unsubscribe function to remove the cookie store change listener
  // when the component is unmounted.
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

// The decoded access token contains a timestamp that indicates when
// it will expire.
export const accessTokenDecoded: Readable<MaybeToken> = derived(userStore, $userStore => {
  if ($userStore && $userStore.token) {
    return jwtDecode($userStore.token) as MaybeToken;
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
  console.log('Refreshing tokens...');
  const res = await fetch('/oidc/refresh', { credentials: 'include', method: 'POST' });
  if (res.ok) {
    console.info('Access token refresh succeeded.');
  } else {
    const errorMessage = await res.json();
    console.error('Access token refresh failed, refresh token is probably expired.');
    throw new Error(`Refresh failed, with the following message: ${JSON.stringify(errorMessage)}`);
  }
}

function reschedule(fn: () => Promise<void>, delay: number, prior: number | null): any {
  if (prior) {
    console.log(`Clearing previous timeout. ${prior}`);
    clearTimeout(prior);
  }
  console.log(`Scheduling ${fn.name} in ${delay}ms`);
  return setTimeout(async () => {
    try {
      await fn();
    } catch (err) {
      console.error('Error in rescheduled function:', err);

      // TODO: show a modal?
      showFailureToast('Failed to refresh your credentials, please login again.');
    }
  }, delay);
}

/**
 * Handles changes and deletions to the cookie store.
 *
 * @param event: CookieChangeEvent - The event containing the changed or deleted cookies.
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
  event.changed.forEach(async ({ name, value }) => {
    if (name === 'accessToken') {
      // set user store
      const baseUser: BaseUser = { id: null, token: value }; // id can be null because any time this function is used, its in the context of oidc, and we specifically catch id being null for oidc in computeRolesFromJWT
      const user: User | null = await computeRolesFromJWT(baseUser, null); // null role because if after a refresh a user has been demoted, wouldn't want to retain an invalid role
      userStore.set(user);
    }
    if (name === 'idToken') {
      const decoded = jwtDecode(value);
      // update user store
      userStore.update(user => {
        if (user && decoded.sub) {
          return {
            ...user,
            id: decoded.sub,
          };
        }
        return user;
      });
    }
    if (name === 'activeRole') {
      // update the user store
      userStore.update(user => {
        if (user) {
          user.activeRole = value;
        }
        return user;
      });
    }
  });
};
