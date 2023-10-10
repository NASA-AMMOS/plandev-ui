import { describe, expect, test } from 'vitest';
import {
  ADMIN_ROLE,
  hasNoAuthorization,
  isAdminRole,
  isPlanCollaborator,
  isPlanOwner,
  isUserAdmin,
  isUserOwner,
} from './permissions';

describe('hasNoAuthorization', () => {
  test('Should return whether or not the user has authorization', () => {
    expect(hasNoAuthorization(null)).toEqual(true);
    expect(
      hasNoAuthorization({
        activeRole: 'user',
        allowedRoles: [ADMIN_ROLE, 'user'],
        defaultRole: 'user',
        id: 'foo',
        permissibleQueries: {},
        rolePermissions: {},
        token: '',
      }),
    ).toEqual(true);

    expect(
      hasNoAuthorization({
        activeRole: 'user',
        allowedRoles: [ADMIN_ROLE, 'user'],
        defaultRole: 'user',
        id: 'foo',
        permissibleQueries: {
          constraint: true,
        },
        rolePermissions: {},
        token: '',
      }),
    ).toEqual(false);
  });
});

describe('Check roles', () => {
  test('Should return whether or not the provided role an "admin" role', () => {
    expect(isAdminRole('user')).toEqual(false);
    expect(isAdminRole('viewer')).toEqual(false);
    expect(isAdminRole('foo')).toEqual(false);
    expect(isAdminRole('admin')).toEqual(false);

    expect(isAdminRole(ADMIN_ROLE)).toEqual(true);
  });

  test('Should return whether or not the current role of the user is "admin"', () => {
    expect(
      isUserAdmin({
        activeRole: 'user',
        allowedRoles: [ADMIN_ROLE, 'user'],
        defaultRole: 'user',
        id: 'foo',
        permissibleQueries: {
          constraint: true,
        },
        rolePermissions: {},
        token: '',
      }),
    ).toEqual(false);

    expect(
      isUserAdmin({
        activeRole: ADMIN_ROLE,
        allowedRoles: [ADMIN_ROLE, 'user'],
        defaultRole: 'user',
        id: 'foo',
        permissibleQueries: {},
        rolePermissions: {},
        token: '',
      }),
    ).toEqual(true);
  });

  test('Should return whether or not the user is the owner of an asset', () => {
    expect(
      isUserOwner(
        {
          activeRole: 'user',
          allowedRoles: [ADMIN_ROLE, 'user'],
          defaultRole: 'user',
          id: 'foo',
          permissibleQueries: {
            constraint: true,
          },
          rolePermissions: {},
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
          activeRole: ADMIN_ROLE,
          allowedRoles: [ADMIN_ROLE, 'user'],
          defaultRole: 'user',
          id: 'foo',
          permissibleQueries: {},
          rolePermissions: {},
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
          allowedRoles: [ADMIN_ROLE, 'user'],
          defaultRole: 'user',
          id: 'foo',
          permissibleQueries: {
            constraint: true,
          },
          rolePermissions: {},
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
          activeRole: ADMIN_ROLE,
          allowedRoles: [ADMIN_ROLE, 'user'],
          defaultRole: 'user',
          id: 'foo',
          permissibleQueries: {},
          rolePermissions: {},
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
          allowedRoles: [ADMIN_ROLE, 'user'],
          defaultRole: 'user',
          id: 'baz',
          permissibleQueries: {
            constraint: true,
          },
          rolePermissions: {},
          token: '',
        },
        {
          collaborators: [{ collaborator: 'foo' }],
          id: 1,
          model_id: 1,
          owner: 'bar',
        },
      ),
    ).toEqual(false);

    expect(
      isPlanCollaborator(
        {
          activeRole: ADMIN_ROLE,
          allowedRoles: [ADMIN_ROLE, 'user'],
          defaultRole: 'user',
          id: 'foo',
          permissibleQueries: {},
          rolePermissions: {},
          token: '',
        },
        {
          collaborators: [{ collaborator: 'foo' }],
          id: 1,
          model_id: 1,
          owner: 'bar',
        },
      ),
    ).toEqual(true);
  });
});
