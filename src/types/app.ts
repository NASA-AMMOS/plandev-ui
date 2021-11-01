export type Env = {
  GATEWAY_URL: string;
  HASURA_URL: string;
};

export type Session = {
  user: User;
};

export type User = {
  id: string;
  ssoToken: string;
};
