import { DashboardLayout } from '@/components/dashboard-layout';
import { SettingsSkeleton } from '@/components/loading-skeletons';

export default function LoadingSettings() {
  return (
    <DashboardLayout>
      <SettingsSkeleton />
    </DashboardLayout>
  );
}
