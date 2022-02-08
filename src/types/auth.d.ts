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
