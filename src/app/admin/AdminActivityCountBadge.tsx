'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { AdminActivityEvent } from '@/lib/admin/activity';

const eventLabels: Record<AdminActivityEvent, string> = {
  listing_created: 'new listings',
  account_created: 'new accounts',
  report_created: 'new reports',
  chat_alert_created: 'new chat alerts',
};

export default function AdminActivityCountBadge({
  staffId,
  eventType,
  initialCount,
}: {
  staffId: string;
  eventType: AdminActivityEvent;
  initialCount: number;
}) {
  const pathname = usePathname();
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let refreshVersion = 0;

    const refreshCount = async () => {
      const requestVersion = ++refreshVersion;
      const { count: unreadCount, error } = await supabase
        .from('admin_activity_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('staff_id', staffId)
        .eq('event_type', eventType)
        .is('read_at', null);

      if (!active || requestVersion !== refreshVersion) return;
      if (error) {
        console.error(`Could not refresh ${eventType} notifications:`, error.message);
        return;
      }

      setCount(unreadCount ?? 0);
    };

    const channel = supabase
      .channel(`admin-activity-${staffId}-${eventType}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_activity_notifications',
          filter: `staff_id=eq.${staffId}`,
        },
        () => {
          void refreshCount();
        },
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          void refreshCount();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Could not subscribe to ${eventType} notifications:`, error?.message);
        }
      });

    void refreshCount();

    return () => {
      active = false;
      refreshVersion += 1;
      void supabase.removeChannel(channel);
    };
  }, [eventType, pathname, staffId]);

  if (count < 1) return null;

  return (
    <span
      className='admin-nav-notification'
      aria-label={`${count} ${eventLabels[eventType]}`}
      title={`${count} ${eventLabels[eventType]}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
