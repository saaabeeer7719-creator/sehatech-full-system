
import { useState, useEffect } from 'react';
import type { UserRole } from '@/lib/types';
import { permissions as allPermissions, type Permissions } from '@/lib/permissions';

export function usePermissions(role: UserRole | undefined): Permissions | null {
  const [permissions, setPermissions] = useState<Permissions | null>(null);

  useEffect(() => {
    if (role && allPermissions[role]) {
      setPermissions(allPermissions[role]);
    } else {
      // Default to no permissions if role is not defined or invalid
      const noPermissions = Object.keys(allPermissions.admin).reduce((acc, key) => {
        (acc as any)[key as keyof Permissions] = false;
        return acc;
      }, {} as Permissions);
      setPermissions(noPermissions);
    }
  }, [role]);

  return permissions;
}

    