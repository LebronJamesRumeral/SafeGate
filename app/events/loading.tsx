import React from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import EventsSkeleton from '@/components/events-skeleton';

export default function Loading() {
  return (
    <DashboardLayout>
      <div className="px-2 sm:px-0">
        <EventsSkeleton />
      </div>
    </DashboardLayout>
  );
}
