import { DashboardLayout } from '@/components/dashboard-layout';
import { ScanSkeleton } from '@/components/loading-skeletons';

export default function LoadingScan() {
  return (
    <DashboardLayout>
      <ScanSkeleton />
    </DashboardLayout>
  );
}
