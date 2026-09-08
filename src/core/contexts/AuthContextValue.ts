import { createContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '../../types/auth';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isMonitor: boolean;
  isFamilia: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// El contexto vive aparte del proveedor: si comparten fichero, cada edición del
// proveedor recrea el contexto y Fast Refresh tira el estado de sesión entero.
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
