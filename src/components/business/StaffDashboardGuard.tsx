"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStaffSession } from '../../hooks/useStaffSession';

export default function StaffDashboardGuard({ children }: { children: React.ReactNode }) {
  const { staffSession, loading } = useStaffSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !staffSession) {
      router.replace('/business/staff-login');
    }
  }, [loading, staffSession, router]);

  if (loading || !staffSession) return null;
  return <>{children}</>;
}
