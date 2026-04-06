'use client';
import { createContext, useContext, useState, useEffect } from 'react';

type Profile = { id: string; name: string };

const ProfileContext = createContext<{
  activeProfile: Profile | null;
  setProfile: (p: Profile | null) => void;
}>({ activeProfile: null, setProfile: () => {} });

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('selected_profile');
    if (saved) setActiveProfile(JSON.parse(saved));
  }, []);

  const setProfile = (p: Profile | null) => {
    setActiveProfile(p);
    if (p) localStorage.setItem('selected_profile', JSON.stringify(p));
    else localStorage.removeItem('selected_profile');
  };

  return (
    <ProfileContext.Provider value={{ activeProfile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);