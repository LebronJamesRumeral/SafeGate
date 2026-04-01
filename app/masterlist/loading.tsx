import { DashboardLayout } from '@/components/dashboard-layout';
import { MasterlistPageSkeleton } from '@/components/masterlist-skeleton';

export default function LoadingMasterlist() {
  return (
    <DashboardLayout>
      <MasterlistPageSkeleton />
    </DashboardLayout>
  );
}
