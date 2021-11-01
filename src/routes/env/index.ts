import { defaultEnv } from '../../stores/app';
import type { Env } from '../../types';

export async function get(): Promise<{ body: Env }> {
  const { env } = process;

  const GATEWAY_URL = env['GATEWAY_URL'] ?? defaultEnv.GATEWAY_URL;
  const HASURA_URL = env['HASURA_URL'] ?? defaultEnv.HASURA_URL;

  return {
    body: {
      GATEWAY_URL,
      HASURA_URL,
    },
  };
}
