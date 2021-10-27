import type { Config } from '../types/config';

export const defaultConfig: Config = {
  CAM_API_URL: 'https://atb-ocio-12b.jpl.nasa.gov:8443/cam-api',
  CAM_ENABLED: true,
  GATEWAY_URL: 'http://localhost:9000',
  HASURA_URL: 'http://localhost:8080/v1/graphql',
  POSTGRES_DATABASE: 'aerie',
  POSTGRES_HOST: 'localhost',
  POSTGRES_PASSWORD: 'aerie',
  POSTGRES_PORT: 5432,
  POSTGRES_USER: 'aerie',
};
