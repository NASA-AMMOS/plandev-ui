import type { HasuraToken } from '$lib/types/oidc';
import type { User } from '../../types/app';
import { reqHasuraWhileAuthenticating } from '../../utilities/requests';

const mutation = `mutation InsertUser($input: users_insert_input!) {
  insert_users_one(
    object: $input,
    on_conflict: {
      constraint: users_pkey,
      update_columns: default_role
    }
  ) {
    username
  }
}`;

export async function insertUser(decodedAccessToken: HasuraToken, accessToken: string): Promise<void> {
  const username = decodedAccessToken['https://hasura.io/jwt/claims']['x-hasura-user-id'];
  const defaultRole = decodedAccessToken['https://hasura.io/jwt/claims']['x-hasura-default-role'];
  const allowedRoles = decodedAccessToken['https://hasura.io/jwt/claims']['x-hasura-allowed-roles'];
  const input = { defaultRole, username };
  const user: User = {
    activeRole: defaultRole,
    allowedRoles,
    defaultRole,
    id: username, // TODO: not exactly. I think this is supposed to be decodedAccessToken.sub. but we don't even use it.
    permissibleQueries: null,
    rolePermissions: null,
    token: accessToken,
  };
  const result = await reqHasuraWhileAuthenticating(mutation, { input }, user);
  console.log('Registering user: ', result);
}
