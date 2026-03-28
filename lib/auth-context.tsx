'use client';


import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

interface User {
  id: string;
  username: string;
  full_name: string | null;
  role: 'admin' | 'teacher' | 'guidance' | string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const publicPaths = ['/login', '/scan-public'];

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('safegate_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      // Always set username to email for consistency
      setUser({
        ...parsed,
        username: parsed.email || parsed.username || '',
      });
    } else if (!publicPaths.includes(pathname)) {
      router.push('/login');
    }
    setLoading(false);
  }, [pathname, router]);

  // Supabase client setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !data.user) {
        return false;
      }
      const role = data.user.user_metadata?.role || 'user';
      setUser({
        id: data.user.id,
        username: data.user.email ?? '',
        full_name: data.user.user_metadata?.full_name || '',
        role,
      });
      // Store the user with role in localStorage for persistence
      localStorage.setItem('safegate_user', JSON.stringify({
        ...data.user,
        role,
      }));
      // Redirect parent to /parent, others to home
      if (role === 'parent') {
        router.push('/parent');
      } else {
        router.push('/');
      }
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('safegate_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
