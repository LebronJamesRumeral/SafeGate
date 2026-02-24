'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: number;
  username: string;
  full_name: string | null;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role?: string) => Promise<boolean>;
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

  const login = async (username: string, password: string, role: string = 'teacher'): Promise<boolean> => {
    try {
      // Simple authentication - in production, use proper authentication
      // For now, accept admin/admin123 or teacher/teacher123
      if (username.trim() && password.trim()) {
        const userData: User = {
          id: 1,
          username: username,
          full_name: role === 'admin' ? 'Administrator' : 'Teacher',
          role: role,
        };
        
        setUser(userData);
        localStorage.setItem('safegate_user', JSON.stringify(userData));
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
