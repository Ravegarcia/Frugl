'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';

export default function NotificationBell({ userId, initial, active = false }: { userId: string; initial: number; active?: boolean }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('bell-' + userId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId }, () => setCount((c) => c + 1))
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Link
      href='/notifications'
      className='nav-icon-link notification-link'
      aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
      aria-current={active ? 'page' : undefined}
      title='Notifications'
    >
      <Bell size={20} />
      {count > 0 && (
        <span aria-hidden='true' className='absolute -right-2 -top-2 rounded-full bg-plum-900 px-1.5 text-xs text-white'>{count}</span>
      )}
    </Link>
  );
}
