'use client';


import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

interface User {
  id: string;
  username: string;
  full_name: string | null;
  role: string;
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

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('safegate_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setLoading(false);
    } else {
      setUser(null);
      setLoading(false);
      if (pathname !== '/login') {
        router.push('/login');
      }
    }
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
      // Fetch user profile from Supabase 'users' table
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, username, full_name, role')
        .eq('id', data.user.id)
        .single();
      if (profileError || !profile) {
        // fallback to minimal info if profile not found
        const fallbackUser: User = {
          id: data.user.id,
          username: data.user.email ?? '',
          full_name: '',
          role: 'user',
        };
        setUser(fallbackUser);
        localStorage.setItem('safegate_user', JSON.stringify(fallbackUser));
      } else {
        setUser(profile);
        localStorage.setItem('safegate_user', JSON.stringify(profile));
      }
      router.push('/');
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
