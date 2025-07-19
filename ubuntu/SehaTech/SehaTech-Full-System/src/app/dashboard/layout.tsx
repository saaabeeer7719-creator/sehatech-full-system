"use client"
import { useUserPresence } from '@/hooks/use-user-presence';
import * as React from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useUserPresence();
  return <>{children}</>;
}
