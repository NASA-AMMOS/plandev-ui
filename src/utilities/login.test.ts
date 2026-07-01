import { goto } from '$app/navigation';
import { env } from '$env/dynamic/public';
import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';
import { logout, shouldRedirectToLogin } from './login';
import { ADMIN_ROLE } from './permissions';

// $app/* and $env/* are virtual modules provided by the SvelteKit Vite plugin. Mock them so
// `logout()` runs in the browser branch with a controllable SSO flag and a spyable navigation.
vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/paths', () => ({ base: '/aerie' }));
vi.mock('$env/dynamic/public', () => ({ env: { PUBLIC_AUTH_SSO_ENABLED: 'false' } }));

describe('login util functions', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('shouldRedirectToLogin', () => {
    test('Should determine if the route should redirect to the login page when login is enabled', () => {
      expect(shouldRedirectToLogin(null)).toEqual(true);
      expect(
        shouldRedirectToLogin({
          activeRole: 'user',
          allowedRoles: [ADMIN_ROLE, 'user'],
          defaultRole: 'user',
          id: 'foo',
          permissibleQueries: {},
          rolePermissions: {},
          token: 'foo',
        }),
      ).toEqual(true);

      expect(
        shouldRedirectToLogin({
          activeRole: 'user',
          allowedRoles: [ADMIN_ROLE, 'user'],
          defaultRole: 'user',
          id: 'foo',
          permissibleQueries: {
            constraints: true,
          },
          rolePermissions: {},
          token: 'foo',
        }),
      ).toEqual(false);
    });
  });

  describe('logout', () => {
    let assign: ReturnType<typeof vi.fn>;
    let originalLocation: Location;

    beforeEach(() => {
      assign = vi.fn();
      // jsdom's window.location can't be spied on directly; replace it for the duration of the test.
      originalLocation = window.location;
      Object.defineProperty(window, 'location', { configurable: true, value: { assign }, writable: true });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}));
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation, writable: true });
      vi.unstubAllGlobals();
    });

    it('posts to the logout endpoint before navigating', async () => {
      await logout();
      expect(fetch).toHaveBeenCalledWith('/aerie/auth/logout', { method: 'POST' });
    });

    describe('when SSO is enabled', () => {
      beforeEach(() => {
        env.PUBLIC_AUTH_SSO_ENABLED = 'true';
      });

      it('does a full-page navigation so the external SSO redirect is followed, not swallowed by an SPA fetch', async () => {
        await logout();
        expect(assign).toHaveBeenCalledWith('/aerie/');
        expect(goto).not.toHaveBeenCalled();
      });
    });

    describe('when SSO is disabled', () => {
      beforeEach(() => {
        env.PUBLIC_AUTH_SSO_ENABLED = 'false';
      });

      it('does a client-side goto to the login route', async () => {
        await logout();
        expect(goto).toHaveBeenCalledWith('/aerie/login', { invalidateAll: true });
        expect(assign).not.toHaveBeenCalled();
      });

      it('includes the reason in the login query string', async () => {
        await logout('Session expired');
        expect(goto).toHaveBeenCalledWith('/aerie/login?reason=Session expired', { invalidateAll: true });
      });
    });
  });
});
