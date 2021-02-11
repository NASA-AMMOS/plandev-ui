export interface LoginResponse {
  message: string;
  ssoCookieName?: string;
  ssoCookieValue?: string;
  success: boolean;
}

export interface LogoutResponse {
  message: string;
  success: boolean;
}
