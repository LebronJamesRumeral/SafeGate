import { DashboardLayout } from '@/components/dashboard-layout';
import { GuidanceReviewSkeleton } from '@/components/loading-skeletons';

export default function LoadingGuidanceReview() {
  return (
    <DashboardLayout>
      <GuidanceReviewSkeleton />
    </DashboardLayout>
  );
}
