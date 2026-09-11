export interface WpUser {
  id: number;
  email: string;
  name: string;
}

export interface CurrentUserResponse {
  loggedIn: boolean;
  user?: WpUser;
}

export interface LoginResponse {
  token: string;
  user_email: string;
  user_nicename: string;
  user_display_name: string;
}

export interface WpErrorResponse {
  code: string;
  message: string;
  data?: {
    status: number;
  };
}

export class AuthError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}