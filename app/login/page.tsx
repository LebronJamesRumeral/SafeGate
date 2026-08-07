'use client';
import React from 'react';

import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Users, UserCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { CookiesBanner } from '@/components/cookies-banner';

const LOGIN_COOLDOWN_SECONDS = 60;
const LOGIN_MAX_FAILURES = 3;
const LOGIN_COOLDOWN_STORAGE_KEY = 'safegate_login_cooldown_until';
const LOGIN_FAILURES_STORAGE_KEY = 'safegate_login_failures';

type LoginCooldownToast = {
  id: string;
  dismiss: () => void;
  update: (toast: {
    id: string;
    title: string;
    description: string;
    variant: 'default' | 'destructive';
  }) => void;
};

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
  const { toast: showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth();
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownToastRef = React.useRef<LoginCooldownToast | null>(null);
  // Privacy Policy modal and checkbox state
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyChecked, setPolicyChecked] = useState(false);
  const [policyEverAccepted, setPolicyEverAccepted] = useState(false);

  // Cookie preferences state
  const [showCookiesBanner, setShowCookiesBanner] = useState(false);
  const [cookiesConsent, setCookiesConsent] = useState<'accepted' | 'essential' | 'declined' | null>(null);

  // On mount, check if user has already accepted policy
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const accepted = localStorage.getItem('safegate_policy_accepted');
      if (accepted === 'true') {
        setPolicyChecked(true);
        setPolicyEverAccepted(true);
      }

      const answered = localStorage.getItem('safegate_cookies_answered');
      const consent = localStorage.getItem('safegate_cookies_consent') as 'accepted' | 'essential' | 'declined' | null;
      setCookiesConsent(consent);
      if (answered !== 'true') {
        setShowCookiesBanner(true);
      }

      const storedCooldownEndsAt = Number(localStorage.getItem(LOGIN_COOLDOWN_STORAGE_KEY));
      if (storedCooldownEndsAt && storedCooldownEndsAt > Date.now()) {
        setCooldownEndsAt(storedCooldownEndsAt);
      } else {
        localStorage.removeItem(LOGIN_COOLDOWN_STORAGE_KEY);
        localStorage.removeItem(LOGIN_FAILURES_STORAGE_KEY);
      }
    }
  }, []);

  React.useEffect(() => {
    if (!cooldownEndsAt) {
      setCooldownRemaining(0);
      return;
    }

    const updateCountdown = () => {
      const remainingSeconds = Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000));
      setCooldownRemaining(remainingSeconds);

      if (remainingSeconds <= 0) {
        setCooldownEndsAt(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(LOGIN_COOLDOWN_STORAGE_KEY);
          localStorage.removeItem(LOGIN_FAILURES_STORAGE_KEY);
        }

        if (cooldownToastRef.current) {
          cooldownToastRef.current.dismiss();
          cooldownToastRef.current = null;
        }
        return;
      }

      if (!cooldownToastRef.current) {
        cooldownToastRef.current = showToast({
          title: 'Login temporarily locked',
          description: `Too many failed attempts. Try again in ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}.`,
          variant: 'destructive',
        });
        return;
      }

      cooldownToastRef.current.update({
        id: cooldownToastRef.current.id,
        title: 'Login temporarily locked',
        description: `Too many failed attempts. Try again in ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}.`,
        variant: 'destructive',
      });
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(interval);
  }, [cooldownEndsAt]);

  React.useEffect(() => {
    if (!cooldownToastRef.current || !cooldownEndsAt || cooldownRemaining <= 0) {
      return;
    }

    cooldownToastRef.current.update({
      id: cooldownToastRef.current.id,
      title: 'Login temporarily locked',
      description: `Too many failed attempts. Try again in ${cooldownRemaining} second${cooldownRemaining === 1 ? '' : 's'}.`,
      variant: 'destructive',
    });
  }, [cooldownRemaining, cooldownEndsAt]);

  const startCooldown = () => {
    const cooldownEnds = Date.now() + LOGIN_COOLDOWN_SECONDS * 1000;
    setCooldownEndsAt(cooldownEnds);

    if (typeof window !== 'undefined') {
      localStorage.setItem(LOGIN_COOLDOWN_STORAGE_KEY, cooldownEnds.toString());
    }

    cooldownToastRef.current = showToast({
      title: 'Login temporarily locked',
      description: `Too many failed attempts. Try again in ${LOGIN_COOLDOWN_SECONDS} seconds.`,
      variant: 'destructive',
    });
  };

  const registerFailedAttempt = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextFailures = Number(localStorage.getItem(LOGIN_FAILURES_STORAGE_KEY) || '0') + 1;
    localStorage.setItem(LOGIN_FAILURES_STORAGE_KEY, String(nextFailures));

    if (nextFailures >= LOGIN_MAX_FAILURES) {
      localStorage.removeItem(LOGIN_FAILURES_STORAGE_KEY);
      startCooldown();
      return;
    }

    const attemptsLeft = LOGIN_MAX_FAILURES - nextFailures;
    showToast({
      title: 'Login Failed',
      description: `Invalid email or password. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left before a ${LOGIN_COOLDOWN_SECONDS}-second lockout.`,
      variant: 'destructive',
    });
  };

  const clearCooldown = () => {
    setCooldownEndsAt(null);
    setCooldownRemaining(0);

    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOGIN_COOLDOWN_STORAGE_KEY);
      localStorage.removeItem(LOGIN_FAILURES_STORAGE_KEY);
    }

    if (cooldownToastRef.current) {
      cooldownToastRef.current.dismiss();
      cooldownToastRef.current = null;
    }
  };

  const isLoginLocked = cooldownRemaining > 0;

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

    if (isLoginLocked) {
      showToast({
        title: 'Login temporarily locked',
        description: `Please wait ${cooldownRemaining} second${cooldownRemaining === 1 ? '' : 's'} before trying again.`,
        variant: 'destructive',
      });
      return;
    }

    // Handle cookies consent restriction before proceeding
    if (cookiesConsent === 'declined') {
      setShowCookiesBanner(true);
      showToast({
        title: 'Cookies Required',
        description: 'Please accept at least essential cookies to log in.',
        variant: 'destructive',
      });
      return;
    }

    if (!cookiesConsent) {
      setShowCookiesBanner(true);
      showToast({
        title: 'Cookie Choice Required',
        description: 'Please make a cookie selection first.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    // Use full email and password for authentication
    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password');
      registerFailedAttempt();
      setLoading(false);
      return;
    }

    clearCooldown();

    // Fetch the latest user from Supabase after login
    if (!supabase) {
      setError('Supabase client is not configured');
      showToast({
        title: 'Login Failed',
        description: 'Supabase client is not configured',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.getUser();
    const role = (data?.user?.user_metadata?.role || '').toLowerCase();
    const allowedRoles = ['teacher', 'admin', 'guidance', 'parent'];
    if (!allowedRoles.includes(role)) {
      await logout();
      setError('Your account role is not allowed in this system. Please contact an administrator.');
      showToast({
        title: 'Access Denied',
        description: 'Your account role is not allowed in this system. Please contact an administrator.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }
    clearCooldown();
    showToast({
      title: 'Login Successful',
      description: `Welcome, ${role === 'parent' ? 'Parent' : role.charAt(0).toUpperCase() + role.slice(1)}!`,
      variant: 'default',
    });
    setLoading(false);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
      {/* Left Side - Navy Background */}
      <div className="hidden lg:flex flex-col justify-center bg-linear-to-br from-blue-950 via-blue-900 to-blue-800 dark:from-blue-950 dark:via-blue-900 dark:to-slate-950 px-8 py-10 xl:px-12 xl:py-14 text-white overflow-hidden min-h-screen">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="relative h-14 w-14 rounded-full overflow-hidden bg-white/10 flex items-center justify-center border border-white/20 shadow-lg">
              <Image 
                src="/SGCDC.png" 
                alt="SGCDC Logo" 
                width={64} 
                height={64} 
                className="w-full h-full object-contain p-2"
                priority
                unoptimized
              />
            </div>
            <div>
              <p className="text-lg font-bold text-white">SafeGate</p>
              <p className="text-xs text-blue-200">Behavior Tracking and Intervention Dashboard</p>
            </div>
          </div>

          <h1 className="text-2xl xl:text-3xl font-bold leading-tight mb-6 text-white">A Smarter Approach to Behavioral Tracking and Intervention</h1>
          <p className="text-blue-100 text-sm xl:text-base leading-relaxed mb-8">SafeGate provides real-time behavioral event tracking, intervention workflows, and risk visibility in one connected platform. Attendance and QR scanning remain supporting features for daily operations and context.</p>

          {/* Role Cards */}
          <div className="space-y-6">
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
      <div className="relative flex items-start lg:items-center justify-center bg-linear-to-b from-slate-50 to-blue-50/60 dark:from-slate-950 dark:to-slate-900 lg:bg-none lg:bg-white lg:dark:bg-slate-900 p-0 lg:p-8 min-h-screen overflow-hidden">
          {/* Decorative fill for empty space below the card on mobile */}
          <div className="lg:hidden pointer-events-none absolute bottom-[-4rem] left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-blue-200/30 dark:bg-blue-500/10 blur-3xl" />
          <div className="lg:hidden pointer-events-none absolute bottom-10 right-4 h-24 w-24 rounded-full bg-orange-200/30 dark:bg-orange-500/10 blur-2xl" />
          <div className="w-full">
          {/* Branded Hero (Mobile Only) */}
          <div className="lg:hidden relative z-0 bg-linear-to-br from-blue-950 via-blue-900 to-blue-800 px-6 pt-8 pb-16 text-white shadow-lg overflow-hidden">
            {/* Decorative glow accents */}
            <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 -left-10 h-32 w-32 rounded-full bg-cyan-300/10 blur-3xl" />

            <div className="relative flex items-center justify-start gap-3 mb-4">
              <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-white/15 flex items-center justify-center shadow-lg border border-white/30">
                <Image 
                  src="/SGCDC.png" 
                  alt="SGCDC Logo" 
                  width={48} 
                  height={48} 
                  className="w-full h-full object-contain p-1"
                  unoptimized
                />
              </div>
              <div className="text-left">
                <p className="font-bold text-white leading-tight">SafeGate</p>
                <p className="text-xs text-blue-100 leading-tight">Behavior Tracking and Intervention Dashboard</p>
              </div>
            </div>
            <p className="relative text-sm text-blue-100 leading-relaxed">A smarter approach to behavior visibility, intervention workflows, and daily school operations.</p>
            <div className="relative mt-5 grid grid-cols-2 gap-2 text-[11px] font-semibold">
              <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-yellow-300/45 bg-yellow-400/15 px-2.5 py-1.5 text-yellow-100">
                <Users className="h-3.5 w-3.5 text-yellow-300 shrink-0" />
                TEACHERS
              </span>
              <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-orange-300/45 bg-orange-400/15 px-2.5 py-1.5 text-orange-100">
                <UserCheck className="h-3.5 w-3.5 text-orange-300 shrink-0" />
                ADMIN
              </span>
              <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-300/45 bg-emerald-400/15 px-2.5 py-1.5 text-emerald-100">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                GUIDANCE
              </span>
              <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-blue-300/45 bg-blue-400/15 px-2.5 py-1.5 text-blue-100">
                <Users className="h-3.5 w-3.5 text-blue-300 shrink-0" />
                PARENT
              </span>
            </div>
          </div>

          <div className="w-full sm:max-w-md lg:max-w-lg mx-0 sm:mx-auto lg:mx-auto mt-12 lg:mt-0 relative z-10 px-5 sm:px-8 pt-10 lg:pt-0 pb-6 lg:px-0 lg:py-0 bg-white dark:bg-slate-900 lg:bg-transparent lg:dark:bg-transparent rounded-t-3xl sm:rounded-3xl lg:rounded-none shadow-[0_-12px_35px_-18px_rgba(15,23,42,0.35)] sm:shadow-2xl lg:shadow-none border-0 sm:border sm:border-slate-200/70 sm:dark:border-slate-800 lg:border-0">

          {/* Floating brand badge on the seam between hero and card (mobile/tablet only) */}
          <div className="lg:hidden absolute left-1/2 -translate-x-1/2 -top-8 z-0 h-16 w-16 rounded-full bg-white dark:bg-slate-900 shadow-lg flex items-center justify-center ring-[6px] ring-white dark:ring-slate-900">
            <div className="h-full w-full rounded-full bg-linear-to-br from-blue-600 via-blue-700 to-blue-900 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-white" strokeWidth={2.25} />
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-6 lg:mb-8">
            <style>{fadeInOut}</style>
            <div
              key="header-login"
              style={{
                animation: 'fadeInSlide 0.5s ease-out forwards',
              }}
            >
              <p className="lg:hidden text-[11px] font-bold tracking-[0.2em] text-blue-600 dark:text-blue-400 text-center mb-1.5">
                WELCOME BACK
              </p>
              <h2 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-slate-900 dark:text-white mb-1.5 lg:mb-2 text-center lg:text-left">
                Sign In
              </h2>
              <p className="text-slate-500 dark:text-white/90 text-sm lg:text-base xl:text-lg text-center lg:text-left">Your role is detected automatically after login</p>
            </div>
          </div>


            {/* Login Form */}

            <form 
              key="form-login"
              onSubmit={handleSubmit} 
              className="space-y-4 lg:space-y-5"
              style={{
                animation: 'fadeInSlide 0.5s ease-out forwards',
              }}
            >

            <div className="space-y-1.5 lg:space-y-2">
              <Label htmlFor="email" className="text-slate-700 dark:text-white text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-white/50" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 pl-10 border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/50 transition-all duration-200 lg:h-auto"
                />
              </div>
            </div>

            <div className="space-y-1.5 lg:space-y-2">
              <Label htmlFor="password" className="text-slate-700 dark:text-white text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-white/50" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 pl-10 border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/50 transition-all duration-200 pr-12 lg:h-auto"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white/70 hover:text-sky-600 dark:hover:text-white rounded focus:outline-none focus:ring-2 focus:ring-sky-400 transition-transform duration-200"
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
              variant={cookiesConsent === 'declined' ? 'destructive' : 'secondary'}
              className="group w-full h-13 lg:h-12 text-base font-bold uppercase tracking-wide transition-all duration-200 active:scale-95 lg:hover:scale-105 rounded-full lg:rounded-md shadow-md shadow-orange-900/20 lg:shadow-none inline-flex items-center justify-center gap-2" 
              disabled={loading || !policyChecked || isLoginLocked}
            >
              {loading ? 'Logging in...' : isLoginLocked ? `Locked for ${cooldownRemaining}s` : cookiesConsent === 'declined' ? 'Cookies Blocked (Click to Reset)' : (
                <>
                  Login
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </>
              )}
            </Button>

            {/* Cookies Warning Banner */}
            {cookiesConsent === 'declined' && (
              <div className="p-3 bg-red-50/90 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-800 dark:text-red-300 text-center select-none animate-fadeInSlide">
                ⚠️ You have declined cookies. Essential cookies are required to authenticate your session.
                <button
                  type="button"
                  onClick={() => setShowCookiesBanner(true)}
                  className="ml-1 underline font-bold hover:text-red-900 dark:hover:text-red-200 focus:outline-none"
                >
                  Enable cookies
                </button>
              </div>
            )}

            {!cookiesConsent && (
              <div className="p-3 bg-yellow-50/90 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50 rounded-xl text-xs text-yellow-800 dark:text-yellow-300 text-center select-none animate-fadeInSlide">
                ⚠️ Cookie preferences must be set to log in.
                <button
                  type="button"
                  onClick={() => setShowCookiesBanner(true)}
                  className="ml-1 underline font-bold hover:text-yellow-900 dark:hover:text-yellow-200 focus:outline-none"
                >
                  Configure cookies
                </button>
              </div>
            )}

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
                <label htmlFor="policy" className="text-xs text-slate-600 dark:text-white/90 select-none">
                  I agree to the{' '}
                  <button type="button" className="underline hover:text-blue-700 dark:hover:text-white" onClick={() => setShowPolicyModal(true)}>
                    Privacy Policy
                  </button>
                  {' '}and{' '}
                  <button type="button" className="underline hover:text-blue-700 dark:hover:text-white" onClick={() => setShowPolicyModal(true)}>
                    Terms of Service
                  </button>
                </label>
              </div>
            )}

            {/* Modal for Privacy Policy and Terms */}
            {showPolicyModal && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-0 lg:items-center lg:p-6">
                <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl w-full max-w-full lg:max-w-xl h-[90vh] lg:h-auto max-h-[90vh] overflow-hidden border-t border-slate-200 dark:border-slate-800 lg:border-none lg:rounded-3xl flex flex-col animate-fadeInModal" style={{ fontFamily: 'inherit' }}>
                  <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-5 py-4 sm:px-8 sm:py-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.4em] font-semibold text-slate-500 dark:text-slate-400">Privacy Policy</p>
                        <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white leading-tight">Consent & terms</h3>
                      </div>
                      <button
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 hover:text-slate-900 dark:hover:text-white shadow-sm focus:outline-none"
                        onClick={handleDeclinePolicy}
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 pb-5 sm:px-8 sm:pb-6 lg:px-10 lg:pb-8 space-y-6 text-slate-700 dark:text-slate-300">
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Why this matters</h4>
                      <p className="text-sm leading-7">
                        We use this policy to keep your data secure and to make sure SafeGate is used safely for attendance, behavioral tracking, and school operations.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Privacy Policy</h4>
                      <p className="text-sm leading-7">
                        Your privacy is important to us. We do not share your data with third parties. All information is handled securely and in accordance with applicable laws.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Terms of Service</h4>
                      <p className="text-sm leading-7">
                        By using SafeGate, you agree to use the app solely for its intended purpose of managing and monitoring school attendance, behavioral events, and related activities. All actions within the app must comply with school policies and applicable laws.
                      </p>
                      <p className="text-sm leading-7">
                        Unauthorized access, data misuse, or attempts to disrupt the service are strictly prohibited and may result in suspension or legal action. SafeGate is designed to protect student privacy and ensure a safe school environment.
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-5 sm:px-8 sm:pb-6 lg:px-10 lg:pb-8">
                    <div className="grid gap-3">
                      <Button variant="secondary" onClick={handleAcceptPolicy} className="w-full px-4 py-3 text-base font-semibold">Accept</Button>
                      <Button variant="outline" onClick={handleDeclinePolicy} className="w-full px-4 py-3 text-base font-semibold">Decline</Button>
                    </div>
                  </div>
                </div>

                <style>{`
                  @keyframes fadeInModal {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                  .animate-fadeInModal { animation: fadeInModal 0.25s cubic-bezier(.4,0,.2,1) both; }
                `}</style>
              </div>
            )}

            {/* Copyright Only */}
            <div className="flex flex-col items-center gap-2 mt-6 lg:mt-8">
              <hr className="w-full border-t border-slate-200 dark:border-slate-700 mb-2" />
              <div className="flex flex-col sm:flex-row justify-between items-center w-full px-1 gap-2 sm:gap-0">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-white/70">© 2026 SafeGate. All rights reserved.</span>
                <button
                  type="button"
                  onClick={() => setShowCookiesBanner(true)}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
                >
                  Cookie Settings
                </button>
              </div>
            </div>
            </form>

          </div>
        </div>
      </div>
      
      {/* Cookies Consent Banner Component */}
      <CookiesBanner 
        isOpen={showCookiesBanner} 
        onClose={() => setShowCookiesBanner(false)} 
        onConsentChange={(consent) => setCookiesConsent(consent)}
      />
    </div>
  );
}