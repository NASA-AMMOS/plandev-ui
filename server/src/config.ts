import { CamApiOptions } from '@gov.nasa.jpl.aerie/cam';
import * as configJson from '../config/config.json';

export interface Config {
  cam: CamApiOptions;
  editor: {
    [username: string]: string;
  };
  environments: {
    [env: string]: Env;
  };
  port: number;
}

export interface Env {
  postgres: {
    database: string;
    host: string;
    password: string;
    port: number;
    user: string;
  };
}

export const config: Config = configJson;

export function getEnv(): Env {
  const env = process***REMOVED***.ENV || 'local';
  return config***REMOVED***ironments[env];
}
