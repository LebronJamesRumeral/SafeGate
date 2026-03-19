import { DashboardLayout } from '@/components/dashboard-layout';
import { MasterlistSkeleton } from '@/components/loading-skeletons';

export default function LoadingMasterlist() {
  return (
    <DashboardLayout>
      <MasterlistSkeleton />
    </DashboardLayout>
  );
}
