import type { User } from './app';

export type JsonWebToken = string;

export type LoginRequestBody = {
  password: string;
  username: string;
};

export type LoginResponseBody = {
  message?: string;
  success: boolean;
  user?: User;
};

export type LoginResponse = {
  body?: LoginResponseBody;
  headers?: Headers;
  status?: number;
};

export type LogoutResponseBody = {
  message: string;
  success: boolean;
};

export type LogoutResponse = {
  body?: LogoutResponseBody;
  headers?: Headers;
  status?: number;
};

export type ReqLoginResponse = {
  message: string;
  success: boolean;
  token: JsonWebToken | null;
};

export type ReqLogoutResponse = {
  message: string;
  success: boolean;
};

export type ReqSessionResponse = {
  message: string;
  success: boolean;
};
