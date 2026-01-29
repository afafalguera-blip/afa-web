import { supabase } from '../lib/supabase';

export interface AuthUser {
  user_id: string;
  username: string;
  login_time: string;
}

export const AuthService = {
  async login(username: string, password: string): Promise<{ success: boolean; message?: string; user?: AuthUser }> {
    try {
      const { data, error } = await supabase.rpc('authenticate_admin', {
        p_username: username,
        p_password: password
      });

      if (error) throw error;

      if (data && data.length > 0 && data[0].success) {
        const user: AuthUser = {
          user_id: data[0].user_id || username,
          username: username,
          login_time: new Date().toISOString()
        };
        this.setSession(user);
        return { success: true, user };
      } else {
        return { success: false, message: 'Usuari o contrasenya incorrectes' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Error de connexió' };
    }
  },

  setSession(user: AuthUser) {
    sessionStorage.setItem('admin_user', JSON.stringify(user));
  },

  getSession(): AuthUser | null {
    const session = sessionStorage.getItem('admin_user');
    if (!session) return null;
    try {
      const user = JSON.parse(session);
      // Check for 24h expiration
      const loginTime = new Date(user.login_time);
      const now = new Date();
      const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        this.logout();
        return null;
      }
      return user;
    } catch {
      return null;
    }
  },

  logout() {
    sessionStorage.removeItem('admin_user');
    window.location.href = '/admin/login';
  },

  isAuthenticated(): boolean {
    return !!this.getSession();
  }
};
