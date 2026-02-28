'use client';


import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

interface User {
  id: number;
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
    } else if (pathname !== '/login') {
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
      // Try Supabase Auth first
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!error && data.user) {
        setUser({
          id: data.user.id,
          username: data.user.email,
          full_name: data.user.user_metadata?.full_name || '',
          role: data.user.role || 'user',
        });
        localStorage.setItem('safegate_user', JSON.stringify(data.user));
        router.push('/');
        return true;
      }
      // If Supabase fails, try backend /login
      const response = await fetch('/backend/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        const result = await response.json();
        setUser({
          id: 0, // backend does not return id, set to 0 or update as needed
          username: email,
          full_name: result.user.full_name || '',
          role: result.user.role || 'user',
        });
        localStorage.setItem('safegate_user', JSON.stringify({
          id: 0,
          username: email,
          full_name: result.user.full_name || '',
          role: result.user.role || 'user',
        }));
        router.push('/');
        return true;
      }
      return false;
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
