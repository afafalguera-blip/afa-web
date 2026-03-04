export type UserRole = 'admin' | 'monitor' | 'familia';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface AuthError {
  message: string;
  status?: number;
}
