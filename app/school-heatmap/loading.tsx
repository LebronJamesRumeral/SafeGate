import { DashboardLayout } from '@/components/dashboard-layout';
import { SchoolHeatmapSkeleton } from '@/components/school-heatmap-skeleton';

export default function LoadingSchoolHeatmap() {
  return (
    <DashboardLayout>
      <SchoolHeatmapSkeleton />
    </DashboardLayout>
  );
}
