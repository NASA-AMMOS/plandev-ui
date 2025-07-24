import type { HasuraToken } from '$lib/types/oidc';
import { reqHasura } from '../../utilities/requests';

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
  const default_role = decodedAccessToken['https://hasura.io/jwt/claims']['x-hasura-default-role'];
  const input = { default_role, username };
  const baseUser = { id: username, token: accessToken };
  const result = await reqHasura(mutation, { input }, baseUser);
  console.log('Registering user: ', result);
}
