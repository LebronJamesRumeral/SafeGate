import { DashboardLayout } from '@/components/dashboard-layout';
import { LoginSkeleton } from '@/components/loading-skeletons';

export default function LoadingLogin() {
  return (
    <DashboardLayout>
      <LoginSkeleton />
    </DashboardLayout>
  );
}
