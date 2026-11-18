'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Laptop, MessageCircle, Tag } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';
import TimeAgo from '@/components/TimeAgo';

export type NotificationItem = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
};

function notificationText(notification: NotificationItem) {
  const payload = notification.payload;
  const title = typeof payload.title === 'string' ? payload.title : 'your listing';

  switch (notification.type) {
    case 'offer': {
      const amount = Number(payload.amount ?? 0).toLocaleString();
      return `You received a ₱${amount} offer on “${title}”.`;
    }
    case 'offer_update':
      return `Your offer on “${title}” was updated${typeof payload.status === 'string' ? ` to ${payload.status}` : ''}.`;
    case 'message':
      return 'You received a new message about a laptop listing.';
    case 'listing_reserved':
      return `“${title}” has been reserved for you.`;
    case 'listing_sold':
      return `“${title}” was marked as sold.`;
    case 'saved_listing_sold':
      return `A laptop you saved, “${title}”, has been sold.`;
    default:
      return 'You have a new update.';
  }
}

function notificationHref(notification: NotificationItem) {
  const payload = notification.payload;
  if (notification.type === 'message' && typeof payload.conversation_id === 'string') {
    return `/messages/${payload.conversation_id}`;
  }
  if (notification.type === 'offer' || notification.type === 'offer_update') return '/offers';
  if (typeof payload.listing_id === 'string') return `/laptops/${payload.listing_id}`;
  return '/notifications';
}

function NotificationTypeIcon({ type }: { type: string }) {
  if (type === 'message') return <MessageCircle size={18} />;
  if (type === 'offer' || type === 'offer_update') return <Tag size={18} />;
  return <Laptop size={18} />;
}

export default function NotificationBell({
  userId,
  initial,
  initialNotifications,
  initialLoadError,
  active = false,
}: {
  userId: string;
  initial: number;
  initialNotifications: NotificationItem[];
  initialLoadError: boolean;
  active?: boolean;
}) {
  const pathname = usePathname();
  const [count, setCount] = useState(initial);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pathname !== '/notifications' && pathname !== '/dashboard' && !pathname.startsWith('/dashboard/')) return;

    const supabase = createClient();
    let active = true;
    void supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('type', 'listing_published')
      .is('read_at', null)
      .then(({ count: unreadCount, error }) => {
        if (!active) return;
        if (error) {
          console.error('Could not refresh unread notification count:', error.message);
          return;
        }
        setCount(unreadCount ?? 0);
      });

    return () => {
      active = false;
    };
  }, [pathname, userId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('bell-' + userId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId }, (payload) => {
        const notification = payload.new as NotificationItem;
        if (notification.type === 'listing_published') return;
        setCount((c) => c + 1);
        setNotifications((current) => [
          notification,
          ...current.filter((item) => item.id !== notification.id),
        ].slice(0, 8));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className='relative' ref={containerRef}>
      <button
        ref={buttonRef}
        type='button'
        className='relative inline-flex size-11 items-center justify-center rounded-full border-0 bg-transparent text-plum-700! whitespace-nowrap transition-[background-color,box-shadow,color] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-lavender-100 hover:text-plum-900! hover:shadow-[0_5px_14px_rgb(24_13_38_/_0.18)] focus-visible:bg-lavender-100 focus-visible:text-plum-900! focus-visible:shadow-[0_5px_14px_rgb(24_13_38_/_0.18)] aria-[current=page]:bg-secondary-container aria-[current=page]:text-plum-900! aria-[current=page]:shadow-[0_4px_12px_rgb(24_13_38_/_0.16)] aria-[current=page]:hover:bg-accent-hover aria-[current=page]:hover:shadow-[0_6px_16px_rgb(24_13_38_/_0.2)]'
        aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
        aria-current={active ? 'page' : undefined}
        aria-expanded={isOpen}
        aria-controls='notification-popover'
        title='Notifications'
        onClick={() => setIsOpen((open) => !open)}
      >
        <Bell size={20} />
        {count > 0 && (
          <span aria-hidden='true' className='absolute right-[0.05rem] top-[0.05rem] z-[2] inline-flex h-[1.2rem] min-w-[1.2rem] items-center justify-center rounded-full border-2 border-surface bg-destructive px-[0.2rem] text-[0.62rem] font-bold leading-none text-destructive-foreground whitespace-nowrap'>
            <span className='block translate-y-px text-center'>{count > 99 ? '99+' : count}</span>
          </span>
        )}
      </button>
      {isOpen && (
        <section
          id='notification-popover'
          className='absolute right-0 top-[calc(100%+0.55rem)] z-40 flex max-h-[min(34rem,calc(100dvh-5rem))] w-[min(25rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-lavender-300 bg-surface text-foreground shadow-[0_1rem_2.5rem_rgb(24_13_38_/_0.18)]'
          aria-label='Recent notifications'
        >
          <header className='flex min-h-[3.75rem] shrink-0 items-center justify-between gap-3 border-b border-lavender-300 px-4 py-3'>
            <h2 className='text-base font-[650] text-foreground'>Notifications</h2>
            <Link href='/notifications' className='text-[0.8rem] font-semibold text-primary underline-offset-[0.2rem] hover:underline' onClick={() => setIsOpen(false)}>View all</Link>
          </header>
          {initialLoadError ? (
            <p className='mx-auto max-w-[19rem] p-6 text-center text-[0.78rem] leading-[1.55] text-muted-foreground' role='alert'>
              Notifications couldn’t be loaded. Please try again later.
            </p>
          ) : notifications.length > 0 ? (
            <div className='max-h-[25rem] min-h-0 overflow-y-auto overscroll-contain'>
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notificationHref(notification)}
                  className={`flex min-h-[4.5rem] items-center gap-3 border-b border-lavender-300 px-4 py-3 text-foreground transition-colors duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-ivory ${
                    notification.read_at ? '' : 'bg-[color-mix(in_srgb,var(--lavender-100)_52%,var(--surface))] hover:bg-lavender-100'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <span className='grid size-10 shrink-0 place-items-center rounded-xl bg-lavender-100 text-primary' aria-hidden='true'>
                    <NotificationTypeIcon type={notification.type} />
                  </span>
                  <span className='grid min-w-0 flex-1 gap-1 text-[0.8rem] leading-[1.45]'>
                    <span>{notificationText(notification)}</span>
                    <span className='text-[0.72rem] text-muted-foreground'><TimeAgo timestamp={notification.created_at} /></span>
                  </span>
                  {!notification.read_at && <span className='size-2 shrink-0 rounded-full bg-destructive' aria-label='Unread' />}
                </Link>
              ))}
            </div>
          ) : (
            <div className='grid justify-items-center gap-2 px-6 pb-9 pt-8 text-center'>
              <span className='mb-1 grid size-14 place-items-center rounded-full bg-lavender-100 text-primary' aria-hidden='true'><Bell size={22} /></span>
              <h3 className='font-heading text-base font-normal'>You’re all caught up</h3>
              <p className='max-w-[19rem] text-[0.78rem] leading-[1.55] text-muted-foreground'>Offers, messages, and listing updates will show up here.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
