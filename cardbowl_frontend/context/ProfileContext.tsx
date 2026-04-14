import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { UserProfile, getUserProfile, saveUserProfile } from "@/lib/storage";
import { syncProfileFromBackend, pushProfileToBackend, isOnline } from "@/lib/sync";
import { useAuth } from "@/context/AuthContext";

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  syncing: boolean;
  updateProfile: (p: UserProfile) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    try {
      // Load local first
      const local = await getUserProfile();
      setProfile(local);

      // Sync from backend if authenticated
      const online = await isOnline();
      if (online) {
        setSyncing(true);
        try {
          const backendProfile = await syncProfileFromBackend();
          if (backendProfile) {
            setProfile(backendProfile);
            await saveUserProfile(backendProfile);
          } else if (local) {
            // No backend profile yet - push local
            const synced = await pushProfileToBackend(local);
            setProfile(synced);
            await saveUserProfile(synced);
          }
        } catch (err) {
          console.warn("Background profile sync failed:", err);
        } finally {
          setSyncing(false);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-sync whenever auth state changes (login/logout)
  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated) {
      refreshProfile();
    } else {
      // Logged out — clear local state
      setProfile(null);
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  const updateProfile = useCallback(
    async (p: UserProfile) => {
      // Save locally first
      await saveUserProfile(p);
      setProfile(p);

      // Push to backend
      const online = await isOnline();
      if (online) {
        try {
          const synced = await pushProfileToBackend(p);
          setProfile(synced);
          await saveUserProfile(synced);
        } catch (err) {
          console.warn("Profile push to backend failed:", err);
        }
      }
    },
    []
  );

  return (
    <ProfileContext.Provider value={{ profile, loading, syncing, updateProfile, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
