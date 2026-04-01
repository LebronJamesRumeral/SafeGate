import { DashboardLayout } from '@/components/dashboard-layout';
import { GuidanceReviewPageSkeleton } from '@/components/guidance-review-skeleton';

export default function LoadingGuidanceReview() {
  return (
    <DashboardLayout>
      <GuidanceReviewPageSkeleton />
    </DashboardLayout>
  );
}
