import { describe, expect, test } from 'vitest';
import type { User } from '../types/app';
import type { Workspace } from '../types/workspace';
import {
  featurePermissions,
  hasNoAuthorization,
  isAdminRole,
  isPlanCollaborator,
  isPlanOwner,
  isUserAdmin,
  isUserOwner,
} from './permissions';
import { ADMIN_ROLE } from './roles';

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

describe('Workspace role grants', () => {
  const rolePermissions: User['rolePermissions'] = {
    delete_file_directory: 'OWNER_COLLABORATOR',
    delete_workspace: 'OWNER',
    write_file_directory: 'OWNER_COLLABORATOR',
  };
  const permissibleQueries: User['permissibleQueries'] = {
    delete_workspace_collaborators_by_pk: true,
    delete_workspace_role_grants_by_pk: true,
    insert_workspace_collaborators: true,
    insert_workspace_role_grants: true,
  };
  const makeUser = (overrides: Partial<User> = {}): User => ({
    activeRole: 'user',
    allowedRoles: ['user', 'mission_ops'],
    defaultRole: 'user',
    id: 'foo',
    permissibleQueries,
    rolePermissions,
    token: '',
    ...overrides,
  });
  const workspace: Workspace = {
    collaborators: [{ collaborator: 'named', workspace_id: 1 }],
    created_at: '',
    disk_location: '',
    id: 1,
    name: 'ws',
    owner: 'bar',
    parcel_id: 1,
    role_grants: [{ role: 'mission_ops' }, { role: 'science_team' }],
    updated_at: '',
  };
  const canWriteFiles = (user: User, ws: Workspace = workspace) =>
    featurePermissions.workspace.canUpdate(user, ws) &&
    featurePermissions.workspace.canCreate(user, ws) &&
    featurePermissions.workspace.canDelete(user, ws);

  test('A member of any granted role can edit files even when it is not their active role', () => {
    expect(canWriteFiles(makeUser())).toEqual(true);
    expect(canWriteFiles(makeUser({ allowedRoles: ['user', 'science_team'] }))).toEqual(true);
  });

  test('A default role that is not in the allowed roles still counts as a membership', () => {
    expect(canWriteFiles(makeUser({ allowedRoles: ['user'], defaultRole: 'mission_ops' }))).toEqual(true);
  });

  test('Users with no matching role, collaboration or ownership cannot edit files', () => {
    expect(canWriteFiles(makeUser({ allowedRoles: ['user', 'other'] }))).toEqual(false);
    expect(canWriteFiles(makeUser(), { ...workspace, role_grants: [] })).toEqual(false);
  });

  test('Owners and named collaborators are unaffected', () => {
    const noGrants = { ...workspace, role_grants: [] };
    expect(canWriteFiles(makeUser({ id: 'bar' }), noGrants)).toEqual(true);
    expect(canWriteFiles(makeUser({ id: 'named' }), noGrants)).toEqual(true);
  });

  test('A read-only active role is not bypassed by a granted role', () => {
    expect(canWriteFiles(makeUser({ activeRole: 'viewer', rolePermissions: {} }))).toEqual(false);
    expect(canWriteFiles(makeUser({ activeRole: 'viewer' }))).toEqual(false);
  });

  test('Role grants do not allow administering the workspace', () => {
    const user = makeUser();
    expect(featurePermissions.workspaces.canUpdate(user, workspace)).toEqual(false);
    expect(featurePermissions.workspaces.canDelete(user, workspace)).toEqual(false);
    expect(featurePermissions.workspaceCollaborators.canCreate(user, workspace)).toEqual(false);
    expect(featurePermissions.workspaceRoleGrants.canCreate(user, workspace)).toEqual(false);
    expect(featurePermissions.workspaceRoleGrants.canDelete(user, workspace)).toEqual(false);
  });

  test('Owners can manage role grants', () => {
    const owner = makeUser({ id: 'bar' });
    expect(featurePermissions.workspaceRoleGrants.canCreate(owner, workspace)).toEqual(true);
    expect(featurePermissions.workspaceRoleGrants.canDelete(owner, workspace)).toEqual(true);
    expect(featurePermissions.workspaces.canUpdate(owner, workspace)).toEqual(true);
  });

  test('Named collaborators cannot manage role grants or workspace metadata', () => {
    const collaborator = makeUser({ id: 'named' });
    expect(featurePermissions.workspaceRoleGrants.canCreate(collaborator, workspace)).toEqual(false);
    expect(featurePermissions.workspaces.canUpdate(collaborator, workspace)).toEqual(false);
  });
});
