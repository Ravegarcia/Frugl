'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function NotificationBell({ userId, initial }: { userId: string; initial: number }) {
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
    <Link href='/notifications' className='relative' aria-label='Notifications'>
      <Bell size={20} />
      {count > 0 && (
        <span className='absolute -right-2 -top-2 rounded-full bg-red-600 px-1.5 text-xs text-white'>{count}</span>
      )}
    </Link>
  );
}
