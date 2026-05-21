import Image from 'next/image';
import { DashboardSkeleton } from '@/components/dashboard-skeleton';

function MobileLoadingShell() {
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
            <div className="h-3 w-2/3 rounded-full bg-linear-to-r from-[#fbbf24] via-[#f59e0b] to-[#38bdf8] animate-pulse" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
            <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
            <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
          </div>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-blue-100/80">
          Loading your secure school workspace for mobile use.
        </p>
      </div>
    </div>
  );
}

export default function LoadingHome() {
  return (
    <>
      <MobileLoadingShell />
      <div className="hidden md:block">
        <DashboardSkeleton />
      </div>
    </>
  );
}
