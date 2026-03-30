
'use client';
import React from 'react';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth();
  // Privacy Policy modal and checkbox state
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyChecked, setPolicyChecked] = useState(false);
  const [policyEverAccepted, setPolicyEverAccepted] = useState(false);

  // On mount, check if user has already accepted policy
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const accepted = localStorage.getItem('safegate_policy_accepted');
      if (accepted === 'true') {
        setPolicyChecked(true);
        setPolicyEverAccepted(true);
      }
    }
  }, []);

  // Setup Supabase client for direct user fetch after login
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // When checkbox is clicked, show modal instead of toggling
  const handlePolicyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!policyEverAccepted) {
      setShowPolicyModal(true);
      // Prevent checkbox from being checked directly
      e.preventDefault();
      return;
    }
    setPolicyChecked(e.target.checked);
  };

  // Accept/Decline handlers for modal
  const handleAcceptPolicy = () => {
    setPolicyChecked(true);
    setPolicyEverAccepted(true);
    setShowPolicyModal(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('safegate_policy_accepted', 'true');
    }
  };
  const handleDeclinePolicy = () => {
    setPolicyChecked(false);
    setShowPolicyModal(false);
  };

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
    const allowedRoles = ['teacher', 'admin', 'guidance', 'parent'];
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
      description: `Welcome, ${role === 'parent' ? 'Parent' : role.charAt(0).toUpperCase() + role.slice(1)}!`,
      variant: 'default',
    });
    setLoading(false);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left Side - Navy Background */}
      <div className="hidden lg:flex flex-col justify-between bg-linear-to-br from-blue-950 via-blue-900 to-blue-800 dark:from-blue-950 dark:via-blue-900 dark:to-slate-950 px-8 py-10 xl:px-12 xl:py-14 text-white overflow-hidden min-h-screen">
        <div>
          <div className="flex items-center gap-3 mb-8">
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

          <h1 className="text-2xl xl:text-3xl font-bold leading-tight mb-8 text-white">A Smarter Approach to Behavioral Tracking and Intervention</h1>
          <p className="text-blue-100 text-sm xl:text-base leading-relaxed mb-12">SafeGate provides real-time behavioral event tracking, intervention workflows, and risk visibility in one connected platform. Attendance and QR scanning remain supporting features for daily operations and context.</p>

          {/* Role Cards */}
          <div className="space-y-12">
            <div className="flex items-start gap-4 bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-yellow-400/20 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-yellow-300" />
              </div>
              <div>
                <p className="font-bold text-white">TEACHERS</p>
                <p className="text-sm text-blue-200">Behavior Logging + Intervention Notes</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-orange-400/20 flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6 text-orange-300" />
              </div>
              <div>
                <p className="font-bold text-white">ADMIN</p>
                <p className="text-sm text-blue-200">Intervention Analytics + Reports</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-emerald-400/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <p className="font-bold text-white">GUIDANCE</p>
                <p className="text-sm text-blue-200">Review + Intervention + Approval Workflow</p>
              </div>
            </div>

            {/* Parent Card */}
            <div className="flex items-start gap-4 bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-blue-400/20 flex items-center justify-center shrink-0">
                {/* Use Users icon for parent, or replace with a more appropriate icon if desired */}
                <Users className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <p className="font-bold text-white">PARENT</p>
                <p className="text-sm text-blue-200">Monitor Child Attendance & Behavior</p>
              </div>
            </div>
          </div>
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
              <h2 className="text-3xl xl:text-4xl font-bold text-slate-900 dark:text-white mb-2">
                Sign In
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-base xl:text-lg">Your role is detected automatically after login</p>
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
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200 pr-12"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-400 transition-transform duration-200"
                  style={{
                    transition: 'transform 0.2s, opacity 0.2s',
                    transform: showPassword ? 'scale(1.15)' : 'scale(1)',
                    opacity: 1
                  }}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" style={{ transition: 'opacity 0.2s', opacity: showPassword ? 1 : 0 }} />
                  ) : (
                    <Eye className="w-5 h-5" style={{ transition: 'opacity 0.2s', opacity: !showPassword ? 1 : 0 }} />
                  )}
                </button>
              </div>
            </div>

            {/* Error toast replaces error alert */}


            <Button 
              type="submit" 
              variant="secondary" 
              className="w-full h-12 text-base font-bold uppercase tracking-wide transition-all duration-200 hover:scale-105 active:scale-95" 
              disabled={loading || !policyChecked}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>

            {/* Privacy Policy & Terms Checkbox (only show if not ever accepted) */}
            {!policyEverAccepted && (
              <div className="flex items-center gap-2 mt-2 mb-2">
                <input
                  id="policy"
                  type="checkbox"
                  checked={policyChecked}
                  onChange={handlePolicyChange}
                  className="accent-blue-600 w-4 h-4 rounded border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-400"
                  required
                  readOnly
                />
                <label htmlFor="policy" className="text-xs text-slate-600 dark:text-slate-300 select-none">
                  I agree to the{' '}
                  <button type="button" className="underline hover:text-blue-700 dark:hover:text-blue-300" onClick={() => setShowPolicyModal(true)}>
                    Privacy Policy
                  </button>
                  {' '}and{' '}
                  <button type="button" className="underline hover:text-blue-700 dark:hover:text-blue-300" onClick={() => setShowPolicyModal(true)}>
                    Terms of Service
                  </button>
                </label>
              </div>
            )}

            {/* Modal for Privacy Policy and Terms */}
            {showPolicyModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-fadeIn">
                <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full px-8 py-8 sm:px-10 sm:py-10 flex flex-col items-center animate-fadeInModal" style={{fontFamily: 'inherit'}}>
                  <button
                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500 text-2xl font-bold focus:outline-none"
                    onClick={handleDeclinePolicy}
                    aria-label="Decline"
                  >
                    ×
                  </button>
                  <h3 className="text-2xl font-bold mb-8 text-slate-900 dark:text-white font-mono text-center">Privacy Policy</h3>
                  <p className="text-base mb-10 text-slate-700 dark:text-slate-300 text-center leading-relaxed font-mono">
                    Your privacy is important to us. We do not share your data with third parties. All information is handled securely and in accordance with applicable laws.
                  </p>
                  <h3 className="text-2xl font-bold mb-8 text-slate-900 dark:text-white font-mono text-center">Terms of Service</h3>
                  <p className="text-base text-slate-700 dark:text-slate-300 text-center leading-relaxed font-mono" style={{marginBottom: '0.5rem'}}>
                    By using this system, you agree to use it responsibly and in accordance with all school and legal guidelines. Misuse may result in account suspension.
                  </p>
                  <div className="flex gap-4 mt-8">
                    <Button variant="outline" onClick={handleDeclinePolicy} className="px-6 py-2 text-base font-semibold">Decline</Button>
                    <Button variant="secondary" onClick={handleAcceptPolicy} className="px-6 py-2 text-base font-semibold">Accept</Button>
                  </div>
                </div>
                <style>{`
                  @keyframes fadeInModal {
                    from { opacity: 0; transform: scale(0.96) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                  }
                  .animate-fadeInModal { animation: fadeInModal 0.25s cubic-bezier(.4,0,.2,1) both; }
                `}</style>
              </div>
            )}

            {/* Copyright Only */}
            <div className="flex flex-col items-center gap-2 mt-8">
              <hr className="w-full border-t border-slate-200 dark:border-slate-700 mb-2" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-full text-center">© 2026 SafeGate. All rights reserved.</span>
            </div>
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
