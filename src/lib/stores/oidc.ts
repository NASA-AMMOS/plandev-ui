import cookie from 'cookie';
import { jwtDecode, type JwtPayload } from 'jwt-decode';
import { derived, get, writable } from 'svelte/store';
import type { BaseUser, User } from '../../types/app';
import { computeRolesFromJWT } from '../../utilities/auth';
import { userStore } from './auth';

// TODO: purge this
export const accessTokenStore = writable<JwtPayload | null>(null);
export const idTokenStore = writable<JwtPayload | null>(null);

// // NOTE: we are suggesting replacing usage of user PageData with a store instead, just so that we can easily update the store on refresh (a case that didn't previously exist)
// export const activeRole = writable<string | null>(null);
// export const user: Readable<User | null> = derived([accessTokenStore, idTokenStore, activeRole], ([_, __, ___]) => {
//   const user: User | null = null; //computeRolesFromJWT({ token: $accessToken, id: 'TODO' }, $activeRole) // TODO: FIX THIS
//   return user;
// });

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

// unsure how to access PageData as a type in a .ts file
type PageData = any;

export function cookieStoreListener(pageData: PageData) {
  const boundHandler = async (ev: Event) => await handleCookieStoreChange(pageData)(ev);

  if (window && 'cookieStore' in window) {
    window.cookieStore.addEventListener('change', boundHandler);
    console.log('Added cookie store change listener.');
  } else {
    console.error('Cookie store is not available in this environment. It is *required* for automatic refresh of JWT.');
  }

  // Set the initial values of the access and id tokens from cookies.
  const tokens = cookie.parse(document.cookie, { decode: jwtDecode }) as any;
  accessTokenStore.set(tokens.accessToken ?? null);
  idTokenStore.set(tokens.idToken ?? null);

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
    window.cookieStore.removeEventListener('change', boundHandler);
    unsubscribe();
  };
}

export const expiresAt = derived(accessTokenStore, $accessToken => {
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
  const res = await fetch('/oidc/refresh', { credentials: 'include', method: 'POST' });
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
const handleCookieStoreChange = (pageData: PageData) => async (ev: Event) => {
  const event = ev as CookieChangeEvent;

  console.log(`Cookie store change detected.`, event);
  event.changed.forEach(async ({ name, value }) => {
    console.log(`Cookie changed: ${name}`);
    if (name === 'accessToken') {
      accessTokenStore.set(jwtDecode(value));

      // set user store
      // NOTE: no longer using PageData and updating that as we have to pass that everywhere and that's a hassle
      const baseUser: BaseUser = { id: null, token: value }; // id can be null because any time this function is used, its in the context of oidc, and we specifically catch id being null for oidc in computeRolesFromJWT
      const user: User | null = await computeRolesFromJWT(baseUser, null); // null role because if after a refresh a user has been demoted, wouldn't want to retain an invalid role
      userStore.set(user ?? undefined);

      // TODO: we need to address every instance of PageData.user being used, and replace it with a userStore which is going to be a more reliable tell
    }
    if (name === 'idToken') {
      const decoded = jwtDecode(value);
      idTokenStore.set(decoded);

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
  });
  event.deleted.forEach(({ name }) => {
    console.log(`Cookie deleted`);
    if (name === 'accessToken') {
      accessTokenStore.set(null);

      // update user
      pageData.user = null;
    }
    if (name === 'idToken') {
      idTokenStore.set(null);

      // update user, if idToken is deleted, then we should just null the user as well
      // TODO: could be unnecessary
      pageData.user = null;
    }
  });
};
