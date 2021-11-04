export type Env = {
  GATEWAY_CLIENT_URL: string;
  GATEWAY_SERVER_URL: string;
  HASURA_CLIENT_URL: string;
  HASURA_SERVER_URL: string;
};

export type Session = {
  user: User;
};

export type User = {
  id: string;
  ssoToken: string;
};
