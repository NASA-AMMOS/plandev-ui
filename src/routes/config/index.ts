import type { Config } from '../../types/config';
import { defaultConfig } from '../../utilities/config';

const { env } = process;

export async function get(): Promise<{ body: Config }> {
  const CAM_API_URL = env['CAM_API_URL'] || defaultConfig.CAM_API_URL;

  const CAM_ENABLED = env['CAM_ENABLED']
    ? env['CAM_ENABLED'] === 'true'
    : defaultConfig.CAM_ENABLED;

  const GATEWAY_URL = env['GATEWAY_URL'] || defaultConfig.GATEWAY_URL;

  const HASURA_URL = env['HASURA_URL'] || defaultConfig.HASURA_URL;

  const POSTGRES_DATABASE =
    env['POSTGRES_DATABASE'] || defaultConfig.POSTGRES_DATABASE;

  const POSTGRES_HOST = env['POSTGRES_HOST'] || defaultConfig.POSTGRES_HOST;

  const POSTGRES_PASSWORD =
    env['POSTGRES_PASSWORD'] || defaultConfig.POSTGRES_PASSWORD;

  const POSTGRES_PORT =
    (env['POSTGRES_PORT'] as unknown as number) || defaultConfig.POSTGRES_PORT;

  const POSTGRES_USER = env['POSTGRES_USER'] || defaultConfig.POSTGRES_USER;

  return {
    body: {
      CAM_API_URL,
      CAM_ENABLED,
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
