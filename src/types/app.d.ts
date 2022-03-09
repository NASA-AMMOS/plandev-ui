type Env = {
  AUTH_TYPE: string;
  GATEWAY_CLIENT_URL: string;
  GATEWAY_SERVER_URL: string;
  HASURA_CLIENT_URL: string;
  HASURA_SERVER_URL: string;
};

type User = {
  id: string;
  ssoToken: string;
};

type Version = {
  branch: string;
  commit: string;
  commitUrl: string;
  date: string;
  name: string;
};
