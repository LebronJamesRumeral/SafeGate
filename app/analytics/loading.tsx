import { DashboardLayout } from '@/components/dashboard-layout';
import { AnalyticsPageSkeleton } from '@/components/analytics-skeleton';

export default function LoadingAnalytics() {
  return (
    <DashboardLayout>
      <AnalyticsPageSkeleton />
    </DashboardLayout>
  );
}
