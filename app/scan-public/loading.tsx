import { ScanSkeleton } from '@/components/loading-skeletons';

export default function LoadingPublicScan() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <ScanSkeleton />
    </div>
  );
}
