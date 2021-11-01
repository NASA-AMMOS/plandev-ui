export type LoginResponse = {
  message: string;
  ssoToken: string | null;
  success: boolean;
  username: string | null;
};

export type LogoutResponse = {
  message: string;
  success: boolean;
};
