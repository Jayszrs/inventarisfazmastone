import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'staff' | 'user';

const ADMIN_EMAILS = ['saputrajaelani423@gmail.com'];

const resolveRole = (roles: AppRole[], email?: string | null): AppRole => {
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) return 'admin';
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('staff')) return 'staff';
  return 'user';
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

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId);

    if (error) {
      const fallbackRole = resolveRole([], targetEmail);
      setRole(fallbackRole);
      return fallbackRole;
    }

    const nextRole = resolveRole((data || []).map((item) => item.role as AppRole), targetEmail);
    setRole(nextRole);
    return nextRole;
  };

  useEffect(() => {
    const loadSessionRole = async (session: Session | null) => {
      setSession(session);
      if (session?.user) {
        await refreshRole(session.user.id, session.user.email);
      } else {
        setRole(null);
      }
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setLoading(true);
      loadSessionRole(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => loadSessionRole(currentSession));

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, role, loading, refreshRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
