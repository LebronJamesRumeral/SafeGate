import { DashboardLayout } from '@/components/dashboard-layout';
import { DashboardSkeleton } from '@/components/loading-skeletons';

export default function LoadingHome() {
  return (
    <DashboardLayout>
      <DashboardSkeleton />
    </DashboardLayout>
  );
}
