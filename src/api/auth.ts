import { API_BASE_URL, API_CONFIGURATION_ERROR } from '../config/api';

export interface AuthUser {
  email: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

class AuthRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthRequestError';
    this.status = status;
  }
}

const authRequest = async <T>(
  path: string,
  body?: Record<string, string>,
  token?: string
): Promise<T> => {
  if (!API_BASE_URL) throw new Error(API_CONFIGURATION_ERROR);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error('Unable to reach the TipidBuddy server. Check your internet connection and try again.');
  }

  const responseText = await response.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(responseText) as Record<string, unknown>;
  } catch {
    if (!response.ok) throw new AuthRequestError('The server could not complete this request.', response.status);
  }
  if (!response.ok) {
    throw new AuthRequestError(
      typeof payload.message === 'string' ? payload.message : 'The server could not complete this request.',
      response.status
    );
  }
  return payload as T;
};

export const registerAccount = (email: string, password: string) =>
  authRequest<AuthSession>('/register', { email, password });

export const loginAccount = (email: string, password: string) =>
  authRequest<AuthSession>('/login', { email, password });

export const loginWithGoogle = (idToken: string) =>
  authRequest<AuthSession>('/google', { idToken });

export const getCurrentUser = (token: string) =>
  authRequest<{ user: AuthUser }>('/me', undefined, token);

export const revokeAuthSession = (token: string) =>
  authRequest<{ success: boolean }>('/logout', {}, token);

export const requestPasswordReset = (email: string) =>
  authRequest<{ message: string }>('/password-reset/request', { email });

export const completePasswordReset = (token: string, password: string) =>
  authRequest<{ message: string }>('/password-reset/complete', { token, password });

export const isUnauthorizedError = (error: unknown) =>
  error instanceof AuthRequestError && error.status === 401;
