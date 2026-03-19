import { DashboardLayout } from '@/components/dashboard-layout';
import { TablePageSkeleton } from '@/components/loading-skeletons';

export default function LoadingAttendance() {
  return (
    <DashboardLayout>
      <TablePageSkeleton />
    </DashboardLayout>
  );
}
