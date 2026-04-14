import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { UserProfile, getUserProfile, saveUserProfile } from "@/lib/storage";

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (p: UserProfile) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getUserProfile();
      setProfile(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const updateProfile = useCallback(
    async (p: UserProfile) => {
      await saveUserProfile(p);
      setProfile(p);
    },
    []
  );

  return (
    <ProfileContext.Provider value={{ profile, loading, updateProfile, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
