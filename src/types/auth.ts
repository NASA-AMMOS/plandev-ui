import type { User, UserRole } from './app';

export type JsonWebToken = string;

export type ChangeUserRoleRequestBody = {
  role: UserRole;
};

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

export type ReqAuthResponse = {
  message: string;
  success: boolean;
  token: JsonWebToken | null;
};

export type ReqSessionResponse = {
  message: string;
  success: boolean;
};

export type ReqValidateSSOResponse = {
  message: string;
  redirectURL?: string;
  success: boolean;
  token?: string;
  userId?: string;
};
