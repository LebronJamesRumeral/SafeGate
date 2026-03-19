import { DashboardLayout } from '@/components/dashboard-layout';
import { AnalyticsSkeleton } from '@/components/loading-skeletons';

export default function LoadingAnalytics() {
  return (
    <DashboardLayout>
      <AnalyticsSkeleton />
    </DashboardLayout>
  );
}
