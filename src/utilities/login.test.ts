import { afterEach, describe, expect, test, vi } from 'vitest';
import { shouldRedirectToLogin } from './login';
import { ADMIN_ROLE } from './permissions';

vi.mock('$env/dynamic/public', () => import.meta***REMOVED***); // https://github.com/sveltejs/kit/issues/8180

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
});
