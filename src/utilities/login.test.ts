import { env } from '$env/dynamic/public';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { isLoginEnabled, shouldRedirectToLogin } from './login';

vi.mock('$env/dynamic/public', () => ({
  env: {
    PUBLIC_LOGIN_PAGE: '',
  },
}));

describe('login util functions', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('isLoginEnabled', () => {
    test('Should return whether or not the login page is enabled', () => {
      vi.mocked(env).PUBLIC_LOGIN_PAGE = '';
      expect(isLoginEnabled()).toEqual(true);

      vi.mocked(env).PUBLIC_LOGIN_PAGE = 'enabled';
      expect(isLoginEnabled()).toEqual(true);

      vi.mocked(env).PUBLIC_LOGIN_PAGE = 'disabled';
      expect(isLoginEnabled()).toEqual(false);
    });
  });

  describe('shouldRedirectToLogin', () => {
    test('Should determine if the route should redirect to the login page when login is enabled', () => {
      vi.mocked(env).PUBLIC_LOGIN_PAGE = 'enabled';

      expect(shouldRedirectToLogin(null)).toEqual(true);
      expect(
        shouldRedirectToLogin({
          activeRole: 'user',
          allowedRoles: ['admin', 'user'],
          defaultRole: 'user',
          id: 'foo',
          permissibleQueries: {},
          token: 'foo',
        }),
      ).toEqual(true);

      expect(
        shouldRedirectToLogin({
          activeRole: 'user',
          allowedRoles: ['admin', 'user'],
          defaultRole: 'user',
          id: 'foo',
          permissibleQueries: {
            constraints: true,
          },
          token: 'foo',
        }),
      ).toEqual(false);
    });

    test('Should not redirect if login is disabled', () => {
      vi.mocked(env).PUBLIC_LOGIN_PAGE = 'disabled';

      expect(shouldRedirectToLogin(null)).toEqual(false);
      expect(
        shouldRedirectToLogin({
          activeRole: 'user',
          allowedRoles: ['admin', 'user'],
          defaultRole: 'user',
          id: 'foo',
          permissibleQueries: {},
          token: 'foo',
        }),
      ).toEqual(false);

      expect(
        shouldRedirectToLogin({
          activeRole: 'user',
          allowedRoles: ['admin', 'user'],
          defaultRole: 'user',
          id: 'foo',
          permissibleQueries: {
            constraints: true,
          },
          token: 'foo',
        }),
      ).toEqual(false);
    });
  });
});
