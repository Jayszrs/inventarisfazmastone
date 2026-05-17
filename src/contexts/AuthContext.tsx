import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { defaultRoleForEmail, isAdminEmail } from '@/lib/admin';

export type AppRole = 'admin' | 'staff' | 'user';

const resolveRole = (roles: AppRole[], email?: string | null): AppRole => {
  if (isAdminEmail(email)) return 'admin';
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('staff')) return 'staff';
  return defaultRoleForEmail(email);
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  refreshRole: (userId?: string, email?: string | null) => Promise<AppRole | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  refreshRole: async () => null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshRole = async (userId?: string, email?: string | null) => {
    const targetUserId = userId ?? session?.user?.id;
    const targetEmail = email ?? session?.user?.email;
    
    if (!targetUserId) {
      setRole(null);
      return null;
    }

    // Dibungkus try-catch agar kegagalan RPC admin tidak mengunci loading login
    if (isAdminEmail(targetEmail)) {
      try {
        await (supabase as any).rpc('claim_allowed_admin_role');
      } catch (rpcError) {
        console.warn('Gagal memicu klaim role otomatis RPC:', rpcError);
      }
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', targetUserId);

      if (error) {
        throw error;
      }

      const nextRole = resolveRole((data || []).map((item) => item.role as AppRole), targetEmail);
      setRole(nextRole);
      return nextRole;
    } catch (err) {
      console.error('Gagal mengambil user_roles dari database:', err);
      // Ganti ke fallback role berdasarkan email daripada membiarkan crash
      const fallbackRole = resolveRole([], targetEmail);
      setRole(fallbackRole);
      return fallbackRole;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadSessionRole = async (currentSession: Session | null) => {
      try {
        if (!isMounted) return;
        setSession(currentSession);
        
        if (currentSession?.user) {
          await refreshRole(currentSession.user.id, currentSession.user.email);
        } else {
          setRole(null);
        }
      } catch (err) {
        console.error('Error saat inisialisasi session role:', err);
      } finally {
        // Blok ini MENJAMIN loading dimatikan apa pun yang terjadi
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Dengarkan perubahan state autentikasi secara aman
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setLoading(true);
      }
      loadSessionRole(nextSession);
    });

    // Ambil session awal saat aplikasi pertama kali dimuat
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      loadSessionRole(initialSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error saat sign out:', err);
    } finally {
      setRole(null);
      setSession(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, role, loading, refreshRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}