import { createContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '../supabase';

export type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refetchProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
