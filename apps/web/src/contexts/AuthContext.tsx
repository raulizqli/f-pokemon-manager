import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthTokens, LoginInput, RegisterInput, UserProfile } from '@pokedex/shared';
import { authApi } from '../services/api';
import { apiClient } from '../services/apiClient';

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'pokedex_auth';

function loadStoredTokens(): { accessToken: string; refreshToken: string; user: UserProfile } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveTokens(tokens: AuthTokens) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: tokens.user,
    }),
  );
}

function clearTokens() {
  localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyTokens = useCallback((tokens: AuthTokens) => {
    saveTokens(tokens);
    setUser(tokens.user);
    apiClient.configure({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      onTokensUpdated: (access, refresh) => {
        const stored = loadStoredTokens();
        if (stored) {
          saveTokens({ accessToken: access, refreshToken: refresh, user: stored.user });
        }
      },
      onLogout: () => {
        clearTokens();
        setUser(null);
      },
    });
  }, []);

  useEffect(() => {
    const stored = loadStoredTokens();
    if (stored) {
      apiClient.configure({
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        onTokensUpdated: (access, refresh) => {
          saveTokens({ accessToken: access, refreshToken: refresh, user: stored.user });
        },
        onLogout: () => {
          clearTokens();
          setUser(null);
        },
      });
      authApi
        .me()
        .then((profile) => setUser(profile))
        .catch(() => clearTokens())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const tokens = await authApi.login(input);
      applyTokens(tokens);
    },
    [applyTokens],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const tokens = await authApi.register(input);
      applyTokens(tokens);
    },
    [applyTokens],
  );

  const logout = useCallback(async () => {
    const stored = loadStoredTokens();
    if (stored?.refreshToken) {
      try {
        await authApi.logout(stored.refreshToken);
      } catch {
        // Ignore logout errors
      }
    }
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
