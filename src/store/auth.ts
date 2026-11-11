import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import {
  getCurrentUser,
  isUnauthorizedError,
  loginAccount,
  loginWithGoogle,
  registerAccount,
  revokeAuthSession,
  type AuthSession,
  type AuthUser,
} from '../api/auth';

const SESSION_KEY = 'tipidbuddy.auth.session';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const saveSession = async (session: AuthSession) => {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  initialized: false,

  initialize: async () => {
    try {
      const saved = await SecureStore.getItemAsync(SESSION_KEY);
      if (!saved) return;

      const session = JSON.parse(saved) as AuthSession;
      if (!session.token || !session.user?.email) {
        await SecureStore.deleteItemAsync(SESSION_KEY);
        return;
      }

      try {
        const result = await getCurrentUser(session.token);
        const refreshed = { ...session, user: result.user };
        await saveSession(refreshed);
        set({ token: refreshed.token, user: refreshed.user });
      } catch (error) {
        if (isUnauthorizedError(error)) {
          await SecureStore.deleteItemAsync(SESSION_KEY);
          return;
        }
        set({ token: session.token, user: session.user });
      }
    } catch (error) {
      console.error('[Auth] Could not restore the saved session:', error);
    } finally {
      set({ initialized: true });
    }
  },

  register: async (email, password) => {
    const session = await registerAccount(email, password);
    await saveSession(session);
    set({ token: session.token, user: session.user });
  },

  login: async (email, password) => {
    const session = await loginAccount(email, password);
    await saveSession(session);
    set({ token: session.token, user: session.user });
  },

  loginGoogle: async (idToken) => {
    const session = await loginWithGoogle(idToken);
    await saveSession(session);
    set({ token: session.token, user: session.user });
  },

  signOut: async () => {
    const token = useAuthStore.getState().token;
    await SecureStore.deleteItemAsync(SESSION_KEY);
    set({ token: null, user: null });
    if (token) {
      try {
        await revokeAuthSession(token);
      } catch {
        throw new Error('You are signed out on this device, but the server could not revoke the session while offline.');
      }
    }
  },
}));
