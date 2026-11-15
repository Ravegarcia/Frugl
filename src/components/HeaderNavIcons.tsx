'use client';

import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bookmark, MessageCircle } from '@/components/icons';
import NotificationBell from '@/components/NotificationBell';
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
  initialSavedIds,
}: {
  userId: string;
  initialUnread: number;
  initialSavedIds: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
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
        className='nav-icon-link nav-saved'
        aria-label={savedCount > 0 ? `Saved laptops, ${savedCount} saved` : 'Saved laptops'}
        aria-current={isCurrent('/saved') ? 'page' : undefined}
        title={savedCount > 0 ? `Saved laptops (${savedCount})` : 'Saved laptops'}
      >
        <Bookmark size={18} />
        {savedCount > 0 && (
          <span aria-live='polite' className='absolute -right-2 -top-2 rounded-full bg-red-600 px-1.5 text-xs text-white'>
            {savedCount > 99 ? '99+' : savedCount}
          </span>
        )}
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
