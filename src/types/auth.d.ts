type LoginRequestBody = {
  password: string;
  username: string;
};

type LoginResponseBody = {
  message?: string;
  success: boolean;
  user?: User;
};

type LoginResponse = {
  body?: LoginResponseBody;
  headers?: import('@sveltejs/kit/types/helper').ResponseHeaders;
  status?: number;
};

type LogoutResponseBody = {
  message: string;
  success: boolean;
};

type LogoutResponse = {
  body?: LogoutResponseBody;
  headers?: import('@sveltejs/kit/types/helper').ResponseHeaders;
  status?: number;
};

type ReqLoginResponse = {
  message: string;
  ssoToken: string | null;
  success: boolean;
  username: string | null;
};

type ReqLogoutResponse = {
  message: string;
  success: boolean;
};

type ReqSessionResponse = {
  message: string;
  success: boolean;
};
