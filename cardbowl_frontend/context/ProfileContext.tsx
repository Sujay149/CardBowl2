import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { UserProfile, getUserProfile, saveUserProfile } from "@/lib/storage";
import { pullProfile, pushProfile, canReachBackend } from "@/lib/sync";
import { enqueue } from "@/lib/offlineQueue";
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
      // 1. Hydrate from local cache instantly
      const local = await getUserProfile();
      setProfile(local);

      // 2. Background sync from backend
      const online = await canReachBackend();
      if (online) {
        setSyncing(true);
        try {
          const serverProfile = await pullProfile();
          if (serverProfile) {
            setProfile(serverProfile);
            await saveUserProfile(serverProfile);
          } else if (local) {
            // No server profile — push local
            const synced = await pushProfile(local);
            setProfile(synced);
            await saveUserProfile(synced);
          }
        } catch (err) {
          console.warn("[Profile] Background sync failed:", err);
        } finally {
          setSyncing(false);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-sync when auth changes
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      refreshProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  const updateProfile = useCallback(
    async (p: UserProfile) => {
      // 1. Save locally first (instant UI update)
      await saveUserProfile(p);
      setProfile(p);

      // 2. Push to backend or queue
      const online = await canReachBackend();
      if (online) {
        try {
          const synced = await pushProfile(p);
          setProfile(synced);
          await saveUserProfile(synced);
        } catch (err) {
          console.warn("[Profile] Push failed, queuing:", err);
          await enqueue("profile_update", p);
        }
      } else {
        await enqueue("profile_update", p);
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
