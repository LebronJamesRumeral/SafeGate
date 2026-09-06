'use client';

import Image from 'next/image';
import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

interface MobileLoadingShellProps {
  onProgressComplete?: () => void;
}

export function MobileLoadingShell({ onProgressComplete }: MobileLoadingShellProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-linear-to-br from-[#0f172a] via-[#172554] to-[#1e3a8a] px-5 py-6 text-white md:hidden">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/8 px-6 py-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-5 flex h-18 w-18 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-lg">
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

        <p className="text-lg font-bold tracking-wide text-white">SafeGate</p>
        <p className="mt-1 text-sm text-blue-100/90">Behavior Tracking and Intervention Dashboard</p>

        <div className="mt-7 space-y-3">
          <div className="h-3 w-full rounded-full bg-white/10">
            <div
              className="progress-fill h-3 rounded-full bg-linear-to-r from-[#fbbf24] via-[#f59e0b] to-[#38bdf8]"
              onAnimationEnd={(event) => {
                if (event.animationName === 'fill') {
                  onProgressComplete?.();
                }
              }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="skeleton-pulse h-12 rounded-xl bg-white/10" />
            <div className="skeleton-pulse skeleton-pulse-delay-1 h-12 rounded-xl bg-white/10" />
            <div className="skeleton-pulse skeleton-pulse-delay-2 h-12 rounded-xl bg-white/10" />
          </div>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-blue-100/80">
          Loading your secure school workspace for mobile use.
        </p>
      </div>
      <style jsx>{`
        @keyframes fill {
          from { width: 0%; }
          to { width: 100%; }
        }

        @keyframes progressGlow {
          0%, 100% { box-shadow: 0 0 0 rgba(56, 189, 248, 0); }
          50% { box-shadow: 0 0 14px rgba(56, 189, 248, 0.45); }
        }

        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.8; }
        }

        .progress-fill {
          animation: fill 3s ease-in-out forwards, progressGlow 1.8s ease-in-out 3s infinite;
        }

        .skeleton-pulse {
          animation: skeletonPulse 1.8s ease-in-out infinite;
        }

        .skeleton-pulse-delay-1 {
          animation-delay: 0.2s;
        }

        .skeleton-pulse-delay-2 {
          animation-delay: 0.4s;
        }
      `}</style>
    </div>
  );
}

export default function AuthLoadingOverlay({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  const { toast } = useToast();
  const [progressComplete, setProgressComplete] = useState(false);

  useEffect(() => {
    if (loading) {
      setProgressComplete(false);
    }
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
    return <MobileLoadingShell onProgressComplete={() => setProgressComplete(true)} />;
  }

  return <>{children}</>;
}