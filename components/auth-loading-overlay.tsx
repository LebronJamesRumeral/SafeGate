'use client';

import Image from 'next/image';
import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

interface MobileLoadingShellProps {
  progress: number; // 0-100, driven by the parent's timer
}

export function MobileLoadingShell({ progress }: MobileLoadingShellProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-linear-to-br from-sky-50 via-white to-amber-50 px-5 py-6 text-slate-900 dark:from-[#0f172a] dark:via-[#172554] dark:to-[#1e3a8a] dark:text-white md:hidden">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white/80 px-6 py-8 text-center shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/8">
        <div className="mx-auto mb-5 flex h-18 w-18 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-white/15 dark:bg-white/10">
          <Image
            src="/SGCDC.png"
            alt="SGCDC SafeGate"
            width={72}
            height={72}
            className="h-14 w-14 object-contain"
            priority
            unoptimized
          />
        </div>

        <p className="text-lg font-bold tracking-wide text-slate-900 dark:text-white">SafeGate</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-blue-100/90">Behavior Tracking and Intervention Dashboard</p>

        <div className="mt-7 space-y-3">
          <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-white/10">
            <div
              className="h-3 rounded-full bg-linear-to-r from-[#fbbf24] via-[#f59e0b] to-[#38bdf8] transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="skeleton-pulse h-12 rounded-xl bg-slate-200 dark:bg-white/10" />
            <div className="skeleton-pulse skeleton-pulse-delay-1 h-12 rounded-xl bg-slate-200 dark:bg-white/10" />
            <div className="skeleton-pulse skeleton-pulse-delay-2 h-12 rounded-xl bg-slate-200 dark:bg-white/10" />
          </div>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-slate-600 dark:text-blue-100/80">
          Loading your secure school workspace for mobile use.
        </p>
      </div>
      <style jsx>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.8; }
        }
        .skeleton-pulse {
          animation: skeletonPulse 1.8s ease-in-out infinite;
        }
        .skeleton-pulse-delay-1 { animation-delay: 0.2s; }
        .skeleton-pulse-delay-2 { animation-delay: 0.4s; }
      `}</style>
    </div>
  );
}

export function DesktopLoadingShell({ progress }: MobileLoadingShellProps) {
  return (
    <div className="hidden min-h-dvh items-center justify-center bg-linear-to-br from-slate-100 via-white to-sky-100 px-12 py-10 text-slate-900 dark:from-[#0b1224] dark:via-[#111b35] dark:to-[#172554] dark:text-white md:flex">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-40 h-96 w-96 rounded-full bg-blue-400/15 blur-3xl dark:bg-blue-500/10" />
        <div className="absolute -bottom-48 -right-24 h-[32rem] w-[32rem] rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-400/10" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(100,116,139,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.09)_1px,transparent_1px)] bg-[size:48px_48px] dark:bg-[linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)]" />
      </div>

      <div className="relative grid w-full max-w-5xl grid-cols-[1.1fr_0.9fr] overflow-hidden rounded-[2rem] border border-slate-200 bg-white/75 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
        <div className="flex flex-col justify-between border-r border-slate-200 px-12 py-12 dark:border-white/10">
          <div>
            <div className="mb-14 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-white/15 dark:bg-white/10">
                <Image
                  src="/SGCDC.png"
                  alt="SGCDC SafeGate"
                  width={64}
                  height={64}
                  className="h-11 w-11 object-contain"
                  priority
                  unoptimized
                />
              </div>
              <div>
                <p className="text-xl font-bold tracking-wide text-slate-900 dark:text-white">SafeGate</p>
                <p className="text-sm text-slate-600 dark:text-blue-100/70">SGCDC smart school workspace</p>
              </div>
            </div>

            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300/80">Preparing your workspace</p>
            <h1 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">Behavior tracking, ready when you are.</h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-slate-600 dark:text-blue-100/65">Loading your secure dashboard and the tools your school team uses every day.</p>
          </div>

          <div className="mt-16">
            <div className="mb-3 flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-blue-100/60">
              <span>Initializing</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10">
              <div
                className="h-2 rounded-full bg-linear-to-r from-[#fbbf24] via-[#f59e0b] to-[#38bdf8] transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center bg-slate-50/80 px-10 py-12 dark:bg-[#111b35]/70">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-blue-100/50">System status</p>
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-white/[0.05]">
              <span className="text-sm text-slate-700 dark:text-blue-100/80">Secure sign-in</span>
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(253,224,71,0.7)]" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-white/[0.05]">
              <span className="text-sm text-slate-700 dark:text-blue-100/80">School workspace</span>
              <span className="skeleton-pulse h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.65)]" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-white/[0.05]">
              <span className="text-sm text-slate-700 dark:text-blue-100/80">Live insights</span>
              <span className="skeleton-pulse skeleton-pulse-delay-1 h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.65)]" />
            </div>
          </div>
          <p className="mt-8 text-xs leading-relaxed text-slate-500 dark:text-blue-100/50">Please keep this window open while SafeGate connects your dashboard.</p>
        </div>
      </div>
    </div>
  );
}

export default function AuthLoadingOverlay({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);
  const [progressComplete, setProgressComplete] = useState(false);

  // Drive progress with a real timer in JS, not a CSS animationend
  // event on an element that may be display:none on this breakpoint.
  useEffect(() => {
    if (loading) {
      setProgress(0);
      setProgressComplete(false);
      return;
    }

    setProgress(0);
    const start = Date.now();
    const duration = 3000;

    const raf = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);

      if (pct < 100) {
        requestAnimationFrame(raf);
      } else {
        setProgressComplete(true);
      }
    };

    const id = requestAnimationFrame(raf);
    return () => cancelAnimationFrame(id);
  }, [loading]);

  useEffect(() => {
    if (loading || !progressComplete) {
      return;
    }

    const role = sessionStorage.getItem('safegate_just_logged_in');
    if (!role) {
      return;
    }

    sessionStorage.removeItem('safegate_just_logged_in');
    toast({
      title: 'Login Successful',
      description: `Welcome, ${role === 'parent' ? 'Parent' : role.charAt(0).toUpperCase() + role.slice(1)}!`,
      variant: 'default',
    });
  }, [loading, progressComplete, toast]);

  if (loading || !progressComplete) {
    return (
      <>
        <MobileLoadingShell progress={progress} />
        <DesktopLoadingShell progress={progress} />
      </>
    );
  }

  return <>{children}</>;
}