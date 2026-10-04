import { DashboardLayout } from '@/components/dashboard-layout';
import { AuditLogPageSkeleton } from '@/components/audit-log-skeleton';

export default function LoadingAuditLog() {
  return (
    <DashboardLayout>
      <AuditLogPageSkeleton />
    </DashboardLayout>
  );
}