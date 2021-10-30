import { defaultEnv } from '../../stores/app';
import type { Env } from '../../types';

const { env } = process;

export async function get(): Promise<{ body: Env }> {
  const GATEWAY_URL = env['GATEWAY_URL'] || defaultEnv.GATEWAY_URL;

  const HASURA_URL = env['HASURA_URL'] || defaultEnv.HASURA_URL;

  const POSTGRES_DATABASE =
    env['POSTGRES_DATABASE'] || defaultEnv.POSTGRES_DATABASE;

  const POSTGRES_HOST = env['POSTGRES_HOST'] || defaultEnv.POSTGRES_HOST;

  const POSTGRES_PASSWORD =
    env['POSTGRES_PASSWORD'] || defaultEnv.POSTGRES_PASSWORD;

  const POSTGRES_PORT =
    (env['POSTGRES_PORT'] as unknown as number) || defaultEnv.POSTGRES_PORT;

  const POSTGRES_USER = env['POSTGRES_USER'] || defaultEnv.POSTGRES_USER;

  return {
    body: {
      GATEWAY_URL,
      HASURA_URL,
      POSTGRES_DATABASE,
      POSTGRES_HOST,
      POSTGRES_PASSWORD,
      POSTGRES_PORT,
      POSTGRES_USER,
    },
  };
}
