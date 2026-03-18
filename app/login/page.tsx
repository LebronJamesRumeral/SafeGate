'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Users, UserCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@supabase/supabase-js';

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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth();

  // Setup Supabase client for direct user fetch after login
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Use full email and password for authentication
    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password');
      toast({
        title: 'Login Failed',
        description: 'Invalid email or password',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Fetch the latest user from Supabase after login
    const { data, error } = await supabase.auth.getUser();
    const role = (data?.user?.user_metadata?.role || '').toLowerCase();
    const allowedRoles = ['teacher', 'admin', 'guidance'];
    if (!allowedRoles.includes(role)) {
      await logout();
      setError('Your account role is not allowed in this system. Please contact an administrator.');
      toast({
        title: 'Access Denied',
        description: 'Your account role is not allowed in this system. Please contact an administrator.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }
    toast({
      title: 'Login Successful',
      description: `Welcome, ${role.charAt(0).toUpperCase() + role.slice(1)}!`,
      variant: 'default',
    });
    setLoading(false);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left Side - Navy Background */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 dark:from-blue-950 dark:via-blue-900 dark:to-slate-950 px-8 py-7 xl:px-10 xl:py-8 text-white overflow-hidden">
        <div>
          <p className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-6">SafeGate Access</p>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="h-14 w-14 rounded-full bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
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
              <p className="text-xs text-blue-200">Behavior Tracking and Intervention Dashboard</p>
            </div>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-4 text-white">A Smarter Approach to Behavioral Tracking and Intervention</h1>
          <p className="text-blue-100 text-base xl:text-lg leading-relaxed mb-8">SafeGate provides real-time behavioral event tracking, intervention workflows, and risk visibility in one connected platform. Attendance and QR scanning remain supporting features for daily operations and context.</p>

          {/* Role Cards */}
          <div className="space-y-3">
            <div className="flex items-start gap-4 bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-yellow-400/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-yellow-300" />
              </div>
              <div>
                <p className="font-bold text-white">TEACHERS</p>
                <p className="text-sm text-blue-200">Behavior Logging + Intervention Notes</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-orange-400/20 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-6 h-6 text-orange-300" />
              </div>
              <div>
                <p className="font-bold text-white">ADMIN</p>
                <p className="text-sm text-blue-200">Intervention Analytics + Reports</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-emerald-400/20 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <p className="font-bold text-white">GUIDANCE</p>
                <p className="text-sm text-blue-200">Review + Intervention + Approval Workflow</p>
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
              key="header-login"
              style={{
                animation: 'fadeInSlide 0.5s ease-out forwards',
              }}
            >
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Sign In
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Your role is detected automatically after login</p>
            </div>
          </div>

          {/* Login Form */}
          <form 
            key="form-login"
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
                placeholder="name@safegate.com"
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

            {/* Error toast replaces error alert */}

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
