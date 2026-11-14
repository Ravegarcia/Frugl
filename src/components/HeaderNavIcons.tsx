'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, MessageCircle } from '@/components/icons';
import NotificationBell from '@/components/NotificationBell';

export default function HeaderNavIcons({ userId, initialUnread }: { userId: string; initialUnread: number }) {
  const pathname = usePathname();
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      <Link
        href='/saved'
        className='nav-icon-link nav-saved'
        aria-label='Saved'
        aria-current={isCurrent('/saved') ? 'page' : undefined}
        title='Saved'
      >
        <Bookmark size={18} />
      </Link>
      <NotificationBell
        userId={userId}
        initial={initialUnread}
        active={isCurrent('/notifications')}
      />
      <Link
        href='/messages'
        className='nav-icon-link nav-messages'
        aria-label='Messages'
        aria-current={isCurrent('/messages') ? 'page' : undefined}
        title='Messages'
      >
        <MessageCircle size={20} />
      </Link>
    </>
  );
}
