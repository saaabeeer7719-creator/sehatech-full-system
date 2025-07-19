"use client"

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const DashboardContent = dynamic(() => import('@/components/dashboard/dashboard-content'), { ssr: false });

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>جار التحميل...</div>}>
      <DashboardContent />
    </Suspense>
  );
}


