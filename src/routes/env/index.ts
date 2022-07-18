import { defaultEnv } from '../../stores/app';

export async function GET(): Promise<{ body: Env }> {
  const { env } = process;

  const AUTH_TYPE = env['AUTH_TYPE'] ?? defaultEnv.AUTH_TYPE;
  const GATEWAY_CLIENT_URL = env['GATEWAY_CLIENT_URL'] ?? defaultEnv.GATEWAY_CLIENT_URL;
  const GATEWAY_SERVER_URL = env['GATEWAY_SERVER_URL'] ?? defaultEnv.GATEWAY_SERVER_URL;
  const HASURA_CLIENT_URL = env['HASURA_CLIENT_URL'] ?? defaultEnv.HASURA_CLIENT_URL;
  const HASURA_SERVER_URL = env['HASURA_SERVER_URL'] ?? defaultEnv.HASURA_SERVER_URL;

  return {
    body: {
      AUTH_TYPE,
      GATEWAY_CLIENT_URL,
      GATEWAY_SERVER_URL,
      HASURA_CLIENT_URL,
      HASURA_SERVER_URL,
    },
  };
}
