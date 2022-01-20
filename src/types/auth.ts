export type ReqLoginResponse = {
  message: string;
  ssoToken: string | null;
  success: boolean;
  username: string | null;
};

export type ReqLogoutResponse = {
  message: string;
  success: boolean;
};

export type ReqSessionResponse = {
  message: string;
  success: boolean;
};
