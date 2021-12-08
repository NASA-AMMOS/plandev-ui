import { defaultEnv } from '../../stores/app';
import type { Env } from '../../types';

export async function get(): Promise<{ body: Env }> {
  const { env } = process;

  const AUTH_TYPE = env['AUTH_TYPE'] ?? defaultEnv.AUTH_TYPE;
  const GATEWAY_CLIENT_URL =
    env['GATEWAY_CLIENT_URL'] ?? defaultEnv.GATEWAY_CLIENT_URL;
  const GATEWAY_SERVER_URL =
    env['GATEWAY_SERVER_URL'] ?? defaultEnv.GATEWAY_SERVER_URL;
  const HASURA_CLIENT_URL =
    env['HASURA_CLIENT_URL'] ?? defaultEnv.HASURA_CLIENT_URL;
  const HASURA_SERVER_URL =
    env['HASURA_SERVER_URL'] ?? defaultEnv.HASURA_SERVER_URL;
  const SCHEDULER_CLIENT_URL =
    env['SCHEDULER_CLIENT_URL'] ?? defaultEnv.SCHEDULER_CLIENT_URL;
  const SCHEDULER_SERVER_URL =
    env['SCHEDULER_SERVER_URL'] ?? defaultEnv.SCHEDULER_SERVER_URL;

  return {
    body: {
      AUTH_TYPE,
      GATEWAY_CLIENT_URL,
      GATEWAY_SERVER_URL,
      HASURA_CLIENT_URL,
      HASURA_SERVER_URL,
      SCHEDULER_CLIENT_URL,
      SCHEDULER_SERVER_URL,
    },
  };
}
