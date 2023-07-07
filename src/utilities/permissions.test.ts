import { describe, expect, test } from 'vitest';
import { hasNoAuthorization, isPlanCollaborator, isPlanOwner, isUserAdmin, isUserOwner } from './permissions';

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

describe('Check roles', () => {
  test('Should return whether or not the current role of the user is "admin"', () => {
    expect(
      isUserAdmin({
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

    expect(
      isUserAdmin({
        activeRole: 'admin',
        allowedRoles: ['admin', 'user'],
        defaultRole: 'user',
        id: 'foo',
        permissibleQueries: {},
        token: '',
      }),
    ).toEqual(true);
  });

  test('Should return whether or not the user is the owner of an asset', () => {
    expect(
      isUserOwner(
        {
          activeRole: 'user',
          allowedRoles: ['admin', 'user'],
          defaultRole: 'user',
          id: 'foo',
          permissibleQueries: {
            constraint: true,
          },
          token: '',
        },
        {
          owner: 'bar',
        },
      ),
    ).toEqual(false);

    expect(
      isUserOwner(
        {
          activeRole: 'admin',
          allowedRoles: ['admin', 'user'],
          defaultRole: 'user',
          id: 'foo',
          permissibleQueries: {},
          token: '',
        },
        {
          owner: 'foo',
        },
      ),
    ).toEqual(true);
  });

  test('Should return whether or not the user is the owner of a plan', () => {
    expect(
      isPlanOwner(
        {
          activeRole: 'user',
          allowedRoles: ['admin', 'user'],
          defaultRole: 'user',
          id: 'foo',
          permissibleQueries: {
            constraint: true,
          },
          token: '',
        },
        {
          collaborators: [],
          id: 1,
          owner: 'bar',
        },
      ),
    ).toEqual(false);

    expect(
      isPlanOwner(
        {
          activeRole: 'admin',
          allowedRoles: ['admin', 'user'],
          defaultRole: 'user',
          id: 'foo',
          permissibleQueries: {},
          token: '',
        },
        {
          collaborators: [],
          id: 1,
          owner: 'foo',
        },
      ),
    ).toEqual(true);
  });

  test('Should return whether or not the user is a collaborator of a plan', () => {
    expect(
      isPlanCollaborator(
        {
          activeRole: 'user',
          allowedRoles: ['admin', 'user'],
          defaultRole: 'user',
          id: 'baz',
          permissibleQueries: {
            constraint: true,
          },
          token: '',
        },
        {
          collaborators: [{ collaborator: 'foo' }],
          id: 1,
          owner: 'bar',
        },
      ),
    ).toEqual(false);

    expect(
      isPlanCollaborator(
        {
          activeRole: 'admin',
          allowedRoles: ['admin', 'user'],
          defaultRole: 'user',
          id: 'foo',
          permissibleQueries: {},
          token: '',
        },
        {
          collaborators: [{ collaborator: 'foo' }],
          id: 1,
          owner: 'bar',
        },
      ),
    ).toEqual(true);
  });
});
