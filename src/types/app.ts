export type Env = {
  GATEWAY_URL: string;
  HASURA_URL: string;
  POSTGRES_DATABASE: string;
  POSTGRES_HOST: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_PORT: number;
  POSTGRES_USER: string;
};

export type Session = {
  user: User;
};

export type User = {
  ssoToken: string;
  userId: string;
};
