'use client';

import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bookmark, MessageCircle } from '@/components/icons';
import NotificationBell, { type NotificationItem } from '@/components/NotificationBell';
import {
  getUnseenSavedListingIds,
  SAVED_LISTING_CHANGED_EVENT,
  setUnseenSavedListingIds,
  subscribeToUnseenSavedListings,
  type SavedListingChange,
} from '@/lib/saved-listings-events';

export default function HeaderNavIcons({
  userId,
  initialUnread,
  initialNotifications,
  initialLoadError,
  initialUnreadMessages,
  initialSavedIds,
}: {
  userId: string;
  initialUnread: number;
  initialNotifications: NotificationItem[];
  initialLoadError: boolean;
  initialUnreadMessages: number;
  initialSavedIds: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const unreadMessages = initialUnreadMessages;
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const savedCount = useSyncExternalStore(
    (onChange) => subscribeToUnseenSavedListings(userId, onChange),
    () => getUnseenSavedListingIds(userId, initialSavedIds).length,
    () => initialSavedIds.length
  );

  useEffect(() => {
    const handleSavedListingChanged = (event: Event) => {
      const change = (event as CustomEvent<SavedListingChange>).detail;
      if (!change || change.userId !== userId) return;

      const unseenIds = new Set(getUnseenSavedListingIds(userId, initialSavedIds));
      if (change.saved) unseenIds.add(change.listingId);
      else unseenIds.delete(change.listingId);
      setUnseenSavedListingIds(userId, [...unseenIds]);
    };

    window.addEventListener(SAVED_LISTING_CHANGED_EVENT, handleSavedListingChanged);
    return () => window.removeEventListener(SAVED_LISTING_CHANGED_EVENT, handleSavedListingChanged);
  }, [initialSavedIds, userId]);

  useEffect(() => {
    const savedIds = new Set(initialSavedIds);
    const unseenIds = getUnseenSavedListingIds(userId, initialSavedIds);
    const currentUnseenIds = unseenIds.filter((id) => savedIds.has(id));
    if (currentUnseenIds.length !== unseenIds.length) {
      setUnseenSavedListingIds(userId, currentUnseenIds);
    }
  }, [initialSavedIds, userId]);

  useEffect(() => {
    if (pathname === '/saved' || pathname.startsWith('/saved/')) {
      setUnseenSavedListingIds(userId, []);
    }
  }, [pathname, userId]);

  useEffect(() => {
    if (
      pathname === '/saved'
      || pathname.startsWith('/saved/')
      || pathname === '/dashboard'
      || pathname.startsWith('/dashboard/')
      || pathname === '/notifications'
      || pathname === '/messages'
      || pathname.startsWith('/messages/')
      || pathname === '/laptops'
      || pathname.startsWith('/laptops/')
    ) {
      router.refresh();
    }
  }, [pathname, router]);

  return (
    <>
      <Link
        href='/saved'
        className='relative inline-flex size-11 items-center justify-center rounded-full border-0 bg-transparent text-plum-700! whitespace-nowrap transition-[background-color,box-shadow,color] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-lavender-100 hover:text-plum-900! hover:shadow-[0_5px_14px_rgb(24_13_38_/_0.18)] focus-visible:bg-lavender-100 focus-visible:text-plum-900! focus-visible:shadow-[0_5px_14px_rgb(24_13_38_/_0.18)] aria-[current=page]:bg-secondary-container aria-[current=page]:text-plum-900! aria-[current=page]:shadow-[0_4px_12px_rgb(24_13_38_/_0.16)] aria-[current=page]:hover:bg-accent-hover aria-[current=page]:hover:shadow-[0_6px_16px_rgb(24_13_38_/_0.2)]'
        aria-label={savedCount > 0 ? `Saved laptops, ${savedCount} saved` : 'Saved laptops'}
        aria-current={isCurrent('/saved') ? 'page' : undefined}
        title={savedCount > 0 ? `Saved laptops (${savedCount})` : 'Saved laptops'}
      >
        <Bookmark size={18} />
        {savedCount > 0 && (
          <span aria-hidden='true' className='absolute right-[0.05rem] top-[0.05rem] z-[2] inline-flex h-[1.2rem] min-w-[1.2rem] items-center justify-center rounded-full border-2 border-surface bg-destructive px-[0.2rem] text-[0.62rem] font-bold leading-none text-destructive-foreground whitespace-nowrap'>
            <span className='block translate-y-px text-center'>{savedCount > 99 ? '99+' : savedCount}</span>
          </span>
        )}
      </Link>
      <NotificationBell
        key={initialNotifications.map(({ id, read_at }) => `${id}:${read_at ?? ''}`).join('|')}
        userId={userId}
        initial={initialUnread}
        initialNotifications={initialNotifications}
        initialLoadError={initialLoadError}
        active={isCurrent('/notifications')}
      />
      <Link
        href='/messages'
        className='relative inline-flex size-11 items-center justify-center rounded-full border-0 bg-transparent text-plum-700! whitespace-nowrap transition-[background-color,box-shadow,color] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-lavender-100 hover:text-plum-900! hover:shadow-[0_5px_14px_rgb(24_13_38_/_0.18)] focus-visible:bg-lavender-100 focus-visible:text-plum-900! focus-visible:shadow-[0_5px_14px_rgb(24_13_38_/_0.18)] aria-[current=page]:bg-secondary-container aria-[current=page]:text-plum-900! aria-[current=page]:shadow-[0_4px_12px_rgb(24_13_38_/_0.16)] aria-[current=page]:hover:bg-accent-hover aria-[current=page]:hover:shadow-[0_6px_16px_rgb(24_13_38_/_0.2)] max-md:hidden'
        aria-label={unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : 'Messages'}
        aria-current={isCurrent('/messages') ? 'page' : undefined}
        title='Messages'
      >
        <MessageCircle size={20} />
        {unreadMessages > 0 && (
          <span aria-hidden='true' className='absolute right-[0.05rem] top-[0.05rem] z-[2] inline-flex h-[1.2rem] min-w-[1.2rem] items-center justify-center rounded-full border-2 border-surface bg-destructive px-[0.2rem] text-[0.62rem] font-bold leading-none text-destructive-foreground whitespace-nowrap'>
            <span className='block translate-y-px text-center'>{unreadMessages > 99 ? '99+' : unreadMessages}</span>
          </span>
        )}
      </Link>
    </>
  );
}
