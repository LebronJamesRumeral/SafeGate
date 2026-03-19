import { DashboardLayout } from '@/components/dashboard-layout';
import { TablePageSkeleton } from '@/components/loading-skeletons';

export default function LoadingBehavioralEvents() {
  return (
    <DashboardLayout>
      <TablePageSkeleton />
    </DashboardLayout>
  );
}
