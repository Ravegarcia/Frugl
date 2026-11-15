'use client';

import { startTransition, useEffect } from 'react';
import { markAdminActivityViewedAction } from './activity-actions';
import type { AdminActivityEvent } from '@/lib/admin/activity';

export default function AdminActivityViewed({ eventType }: { eventType: AdminActivityEvent }) {
  useEffect(() => {
    let active = true;

    startTransition(() => {
      void markAdminActivityViewedAction(eventType).catch((error: unknown) => {
        if (active) {
          console.error(`Could not clear ${eventType} notifications:`, error);
        }
      });
    });

    return () => {
      active = false;
    };
  }, [eventType]);

  return null;
}
