import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
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
import { fullSync } from "@/lib/sync";

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
  const syncRan = useRef(false);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        const user = await getStoredUser();
        if (token && user) {
          setState({ user, isAuthenticated: true, isLoading: false });

          // Background sync on app start (non-blocking)
          if (!syncRan.current) {
            syncRan.current = true;
            fullSync().catch((err) =>
              console.warn("[Auth] Background sync on restore failed:", err)
            );
          }
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

    // Sync after login (non-blocking)
    fullSync().catch((err) =>
      console.warn("[Auth] Post-login sync failed:", err)
    );
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
    console.log("[Auth] signOut");
    try {
      await clearAuth();
    } catch (err) {
      console.warn("[Auth] clearAuth error:", err);
    }
    syncRan.current = false;
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
