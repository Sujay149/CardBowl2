import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  AuthUser,
  apiPublicPost,
  saveTokens,
  saveUser,
  getStoredUser,
  getAccessToken,
  clearAuth,
} from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  mobileNo?: string;
}

interface AuthResponse {
  token: string;
  refreshToken: string;
  uniqueKey: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        const user = await getStoredUser();
        if (token && user) {
          setState({ user, isAuthenticated: true, isLoading: false });
        } else {
          setState({ user: null, isAuthenticated: false, isLoading: false });
        }
      } catch {
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await apiPublicPost<AuthResponse>("/auth/login", {
      email,
      password,
    });

    const user: AuthUser = {
      uniqueKey: data.uniqueKey,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
    };

    await saveTokens({ token: data.token, refreshToken: data.refreshToken });
    await saveUser(user);
    setState({ user, isAuthenticated: true, isLoading: false });
  }, []);

  const signUp = useCallback(async (signUpData: SignUpData) => {
    const data = await apiPublicPost<AuthResponse>("/auth/register", signUpData);

    const user: AuthUser = {
      uniqueKey: data.uniqueKey,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
    };

    await saveTokens({ token: data.token, refreshToken: data.refreshToken });
    await saveUser(user);
    setState({ user, isAuthenticated: true, isLoading: false });
  }, []);

  const signOut = useCallback(async () => {
    await clearAuth();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
