'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const fadeInOut = `
  @keyframes fadeInSlide {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeOutSlide {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-10px);
    }
  }
`;

type AccountType = 'teacher' | 'admin';

export default function LoginPage() {
  const [accountType, setAccountType] = useState<AccountType>('teacher');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Use full email and password for authentication
    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left Side - Navy Background */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 dark:from-blue-950 dark:via-blue-900 dark:to-slate-950 p-12 text-white">
        <div>
          <p className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-8">Teacher Login</p>
          
          <div className="flex items-center gap-4 mb-12">
            <div className="h-16 w-16 rounded-full bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
              <Image 
                src="/SGCDC.png" 
                alt="SGCDC Logo" 
                width={64} 
                height={64} 
                className="w-full h-full object-contain p-2"
                priority
              />
            </div>
            <div>
              <p className="text-lg font-bold text-white">SafeGate</p>
              <p className="text-xs text-blue-200">Student Attendance Dashboard</p>
            </div>
          </div>

          <h1 className="text-5xl font-bold leading-tight mb-6 text-white">A Smarter Approach to Attendance Management</h1>
          <p className="text-blue-100 text-lg leading-relaxed mb-12 text-white">SafeGate provides real-time attendance monitoring, structured workflows, and compliance support in a single dashboard. Built for educational institutions requiring accuracy, efficiency, and automated parent notifications.</p>

          {/* Role Cards */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-white/5 backdrop-blur border border-white/10 rounded-lg p-5 hover:bg-white/10 transition-colors">
              <div className="h-12 w-12 rounded-lg bg-yellow-400/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-yellow-300" />
              </div>
              <div>
                <p className="font-bold text-white">TEACHERS</p>
                <p className="text-sm text-blue-200">QR Scan + Check-in</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/5 backdrop-blur border border-white/10 rounded-lg p-5 hover:bg-white/10 transition-colors">
              <div className="h-12 w-12 rounded-lg bg-orange-400/20 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-6 h-6 text-orange-300" />
              </div>
              <div>
                <p className="font-bold text-white">ADMIN</p>
                <p className="text-sm text-blue-200">Analytics + Reports</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs font-semibold text-white">
          <p>© 2026 SafeGate. All rights reserved.</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center bg-white dark:bg-slate-900 p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-lg bg-blue-950 flex items-center justify-center">
                <Image 
                  src="/SGCDC.png" 
                  alt="SGCDC Logo" 
                  width={48} 
                  height={48} 
                  className="w-full h-full object-contain p-1"
                />
              </div>
              <div className="text-left">
                <p className="font-bold text-blue-950 dark:text-white">SafeGate</p>
              </div>
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <style>{fadeInOut}</style>
            <div
              key={`header-${accountType}`}
              style={{
                animation: 'fadeInSlide 0.5s ease-out forwards',
              }}
            >
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {accountType === 'teacher' ? 'Teacher Login' : 'Admin Login'}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Choose your role, then sign in to continue</p>
            </div>
          </div>

          {/* Role Tabs */}
          <div className="mb-8">
            <div className="flex gap-0 border-b-2 border-gray-300 dark:border-slate-700">
              {[
                { label: 'TEACHER', value: 'teacher' },
                { label: 'ADMIN', value: 'admin' }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAccountType(option.value as AccountType)}
                  className={`flex-1 py-3 px-4 cursor-pointer font-bold text-center text-sm transition-all duration-300 relative ${
                    accountType === option.value
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-yellow-500 dark:text-yellow-400 hover:opacity-75'
                  }`}
                >
                  {option.label}
                  {accountType === option.value && (
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-600 to-orange-500 dark:from-orange-400 dark:to-orange-300"
                      style={{
                        animation: 'fadeInSlide 0.3s ease-out forwards',
                      }}
                    ></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Login Form */}
          <form 
            key={`form-${accountType}`}
            onSubmit={handleSubmit} 
            className="space-y-5"
            style={{
              animation: 'fadeInSlide 0.5s ease-out forwards',
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder={accountType === 'admin' ? 'admin@safegate.com' : 'teacher@safegate.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200"
              />
            </div>

            {error && (
              <div
                style={{
                  animation: 'fadeInSlide 0.3s ease-out forwards',
                }}
              >
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            <Button 
              type="submit" 
              variant="secondary" 
              className="w-full h-12 text-base font-bold uppercase tracking-wide transition-all duration-200 hover:scale-105 active:scale-95" 
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          {/* Demo Credentials - Optional */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 rounded-lg text-sm">
              <p className="font-semibold text-orange-900 dark:text-orange-400 mb-2">Demo Credentials:</p>
              <div className="space-y-1 text-xs text-orange-800 dark:text-orange-300">
                <p><strong>Teacher:</strong> teacher / teacher123</p>
                <p><strong>Admin:</strong> admin / admin123</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
