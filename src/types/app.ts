export type Env = {
  AUTH_TYPE: string;
  GATEWAY_CLIENT_URL: string;
  GATEWAY_SERVER_URL: string;
  HASURA_CLIENT_URL: string;
  HASURA_SERVER_URL: string;
  SCHEDULER_CLIENT_URL: string;
  SCHEDULER_SERVER_URL: string;
};

export type Session = {
  user: User;
};

export type User = {
  id: string;
  ssoToken: string;
};
