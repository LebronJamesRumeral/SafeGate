import { DashboardSkeleton } from '@/components/dashboard-skeleton';
import { MobileLoadingShell } from '@/components/auth-loading-overlay';

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
