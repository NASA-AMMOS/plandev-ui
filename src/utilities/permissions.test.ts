import { describe, expect, test } from 'vitest';
import { hasNoAuthorization } from './permissions';

describe('hasNoAuthorization', () => {
  test('Should return whether or not the user has authorization', () => {
    expect(hasNoAuthorization(null)).toEqual(true);
    expect(
      hasNoAuthorization({
        activeRole: 'user',
        allowedRoles: ['admin', 'user'],
        defaultRole: 'user',
        id: 'foo',
        permissibleQueries: {},
        token: '',
      }),
    ).toEqual(true);

    expect(
      hasNoAuthorization({
        activeRole: 'user',
        allowedRoles: ['admin', 'user'],
        defaultRole: 'user',
        id: 'foo',
        permissibleQueries: {
          constraint: true,
        },
        token: '',
      }),
    ).toEqual(false);
  });
});
