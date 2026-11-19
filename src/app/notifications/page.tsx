import { connection } from 'next/server';
import Link from 'next/link';
import { requireMarketplaceUser } from '@/lib/auth';
import { coverUrl } from '@/lib/queries';
import EmptyState from '@/components/EmptyState';
import TimeAgo from '@/components/TimeAgo';
import { Laptop, MessageCircle, Tag } from '@/components/icons';
import type { NotificationItem } from '@/components/NotificationBell';
import TabIndicator from '@/components/motion/TabIndicator';
import Stagger from '@/components/motion/Stagger';
import StaggerItem from '@/components/motion/StaggerItem';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'for-action', label: 'For action' },
  { id: 'activity', label: 'Activity' },
  { id: 'offers', label: 'Offers' },
  { id: 'messages', label: 'Messages' },
  { id: 'listings', label: 'Listings' },
] as const;

type NotificationFilter = (typeof FILTERS)[number]['id'];

const CATEGORY_BY_TYPE: Record<string, Exclude<NotificationFilter, 'all' | 'for-action' | 'activity'>> = {
  offer: 'offers',
  offer_update: 'offers',
  message: 'messages',
  listing_reserved: 'listings',
  listing_sold: 'listings',
  listing_rejected: 'listings',
  saved_listing_sold: 'listings',
  listing_saved: 'listings',
};

const FOR_ACTION_TYPES = new Set(['offer', 'message', 'listing_reserved', 'listing_sold']);
const ACTIVITY_TYPES = new Set(['offer_update', 'listing_rejected', 'saved_listing_sold', 'listing_saved']);

function isNotificationFilter(value: string | undefined): value is NotificationFilter {
  return FILTERS.some((filter) => filter.id === value);
}

function matchesNotificationFilter(notification: NotificationItem, filter: NotificationFilter) {
  if (filter === 'all') return true;
  if (filter === 'for-action') return FOR_ACTION_TYPES.has(notification.type);
  if (filter === 'activity') return ACTIVITY_TYPES.has(notification.type);
  return CATEGORY_BY_TYPE[notification.type] === filter;
}

type ListingContext = {
  id: string;
  title: string;
  seller_id: string;
  cover: string | null;
  sellerName: string | null;
};

type ConversationContext = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  buyerName: string | null;
  sellerName: string | null;
};

type OfferContext = {
  listing_id: string;
  amount: number;
  buyerName: string | null;
};

function unwrapProfileName(relation: unknown): string | null {
  if (!relation) return null;
  if (Array.isArray(relation)) {
    const first = relation[0] as { name?: unknown } | undefined;
    return typeof first?.name === 'string' && first.name.trim() ? first.name.trim() : null;
  }
  const obj = relation as { name?: unknown };
  return typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : null;
}

function renderNotificationCopy(
  notification: NotificationItem,
  currentUserId: string,
  listingsById: Map<string, ListingContext>,
  conversationsById: Map<string, ConversationContext>,
  offersByListingId: Map<string, OfferContext[]>
) {
  const { payload } = notification;
  const conversationId = typeof payload.conversation_id === 'string' ? payload.conversation_id : null;
  const conversation = conversationId ? conversationsById.get(conversationId) : undefined;
  const listingId =
    typeof payload.listing_id === 'string'
      ? payload.listing_id
      : conversation?.listing_id ?? null;
  const listing = listingId ? listingsById.get(listingId) : undefined;
  const rawTitle =
    typeof payload.title === 'string' && payload.title.trim()
      ? payload.title.trim()
      : listing?.title ?? 'your item';

  switch (notification.type) {
    case 'offer': {
      const amountNum = Number(payload.amount ?? 0);
      const amount = amountNum.toLocaleString();
      const matchingOffers = listingId ? offersByListingId.get(listingId) ?? [] : [];
      const matchedOffer =
        matchingOffers.find((item) => Number(item.amount) === amountNum && item.buyerName) ??
        matchingOffers[0];
      const buyerName =
        (typeof payload.buyer_name === 'string' && payload.buyer_name.trim()) ||
        matchedOffer?.buyerName ||
        'A buyer';
      return (
        <>
          <strong>{buyerName}</strong> made a ₱{amount} offer on <strong>{rawTitle}</strong>.
        </>
      );
    }
    case 'offer_update': {
      const status = typeof payload.status === 'string' ? payload.status : 'updated';
      const actorName =
        listing && listing.seller_id !== currentUserId && listing.sellerName
          ? listing.sellerName
          : rawTitle;
      if (actorName !== rawTitle) {
        return (
          <>
            <strong>{actorName}</strong> {status} your offer on <strong>{rawTitle}</strong>.
          </>
        );
      }
      return (
        <>
          Your offer on <strong>{rawTitle}</strong> was updated to <strong>{status}</strong>.
        </>
      );
    }
    case 'message': {
      const otherPartyName = conversation
        ? conversation.buyer_id === currentUserId
          ? conversation.sellerName
          : conversation.buyerName
        : null;
      const senderName =
        (typeof payload.sender_name === 'string' && payload.sender_name.trim()) ||
        otherPartyName ||
        'A member';
      return (
        <>
          <strong>{senderName}</strong> sent you a message about <strong>{rawTitle}</strong>.
        </>
      );
    }
    case 'listing_reserved': {
      const sellerName = listing?.sellerName;
      return sellerName ? (
        <>
          <strong>{sellerName}</strong> has reserved <strong>{rawTitle}</strong> for you.
        </>
      ) : (
        <>
          <strong>{rawTitle}</strong> has been reserved for you.
        </>
      );
    }
    case 'listing_sold':
      return (
        <>
          <strong>{rawTitle}</strong>{' '}
          {typeof payload.transaction_id === 'string'
            ? 'was sold to you. Rate the seller.'
            : 'was marked as sold.'}
        </>
      );
    case 'listing_rejected': {
      const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
      return (
        <>
          <strong>{rawTitle}</strong> needs changes before it can be published.
          {reason ? <> Administrator feedback: {reason}</> : null}
        </>
      );
    }
    case 'saved_listing_sold': {
      const sellerName =
        (typeof payload.seller_name === 'string' && payload.seller_name.trim()) ||
        listing?.sellerName ||
        rawTitle;
      if (sellerName !== rawTitle) {
        return (
          <>
            <strong>{sellerName}</strong> has sold the item to another buyer.
          </>
        );
      }
      return (
        <>
          <strong>{rawTitle}</strong> has been sold to another buyer.
        </>
      );
    }
    case 'listing_saved': {
      const actorName =
        (typeof payload.actor_name === 'string' && payload.actor_name.trim()) || 'Someone';
      return (
        <>
          <strong>{actorName}</strong> liked your item.
        </>
      );
    }
    default:
      return (
        <>
          <strong>Frugl</strong> sent you a new marketplace update.
        </>
      );
  }
}

function notificationHref(notification: NotificationItem) {
  const { payload } = notification;
  if (notification.type === 'message') {
    return typeof payload.conversation_id === 'string'
      ? `/messages/${payload.conversation_id}`
      : '/messages';
  }
  if (notification.type === 'offer' || notification.type === 'offer_update') return '/offers';
  if (notification.type === 'listing_sold' && typeof payload.transaction_id === 'string') {
    return `/reviews/new?transactionId=${encodeURIComponent(payload.transaction_id)}`;
  }
  if (typeof payload.listing_id === 'string') return `/laptops/${payload.listing_id}`;
  return '/notifications';
}

function NotificationIcon({ type }: { type: string }) {
  if (type === 'message') return <MessageCircle size={18} />;
  if (type === 'offer' || type === 'offer_update') return <Tag size={18} />;
  return <Laptop size={18} />;
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await connection();
  const { filter: requestedFilter } = await searchParams;
  const activeFilter = isNotificationFilter(requestedFilter) ? requestedFilter : 'all';
  const { supabase, user } = await requireMarketplaceUser('/notifications');

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .neq('type', 'listing_published')
    .order('created_at', { ascending: false })
    .limit(40);
  const visibleNotifications: NotificationItem[] = (notifications ?? []).filter(
    (notification) => notification.type !== 'listing_published'
  );
  const filteredNotifications = visibleNotifications.filter((notification) =>
    matchesNotificationFilter(notification, activeFilter)
  );

  // Batch-load conversations, listings (with photos + seller names), and offers so each item shows its real product thumbnail and actor name
  const conversationIds = Array.from(
    new Set(
      visibleNotifications
        .map((n) => (typeof n.payload.conversation_id === 'string' ? n.payload.conversation_id : null))
        .filter((id): id is string => Boolean(id))
    )
  );

  const conversationsById = new Map<string, ConversationContext>();
  if (conversationIds.length > 0) {
    const { data: convRows } = await supabase
      .from('conversations')
      .select(
        'id, listing_id, buyer_id, seller_id, buyer:profiles!conversations_buyer_id_fkey(name), seller:profiles!conversations_seller_id_fkey(name)'
      )
      .in('id', conversationIds);

    for (const row of convRows ?? []) {
      conversationsById.set(row.id, {
        id: row.id,
        listing_id: row.listing_id,
        buyer_id: row.buyer_id,
        seller_id: row.seller_id,
        buyerName: unwrapProfileName(row.buyer),
        sellerName: unwrapProfileName(row.seller),
      });
    }
  }

  const listingIds = Array.from(
    new Set(
      [
        ...visibleNotifications.map((n) =>
          typeof n.payload.listing_id === 'string' ? n.payload.listing_id : null
        ),
        ...Array.from(conversationsById.values()).map((c) => c.listing_id),
      ].filter((id): id is string => Boolean(id))
    )
  );

  const listingsById = new Map<string, ListingContext>();
  const offersByListingId = new Map<string, OfferContext[]>();

  if (listingIds.length > 0) {
    const [listingsRes, offersRes] = await Promise.all([
      supabase
        .from('listings')
        .select(
          'id, title, seller_id, listing_photos(image_url, sort_order), seller:profiles!listings_seller_id_fkey(name)'
        )
        .in('id', listingIds),
      supabase
        .from('offers')
        .select('listing_id, amount, buyer:profiles!offers_buyer_id_fkey(name)')
        .in('listing_id', listingIds)
        .order('created_at', { ascending: false }),
    ]);

    for (const row of listingsRes.data ?? []) {
      listingsById.set(row.id, {
        id: row.id,
        title: row.title,
        seller_id: row.seller_id,
        cover: coverUrl(row),
        sellerName: unwrapProfileName(row.seller),
      });
    }

    for (const row of offersRes.data ?? []) {
      const list = offersByListingId.get(row.listing_id) ?? [];
      list.push({
        listing_id: row.listing_id,
        amount: Number(row.amount ?? 0),
        buyerName: unwrapProfileName(row.buyer),
      });
      offersByListingId.set(row.listing_id, list);
    }
  }

  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .neq('type', 'listing_published')
    .is('read_at', null);

  const emptyTitle = visibleNotifications.length
    ? 'No updates in this category'
    : 'You’re all caught up';
  const emptyHint = visibleNotifications.length
    ? 'Choose another filter to see more updates.'
    : 'Offers, messages, and listing updates will show up here.';

  return (
    <div
      className='utility-page notifications-page'
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto',
        height: 'calc(100dvh - 6.75rem)',
        maxHeight: 'calc(100dvh - 6.75rem)',
        minHeight: 0,
        gap: 0,
        overflow: 'hidden',
      }}
    >
      <style>{`
        .app-body:has(.notifications-page:not([style*="display: none"]):not([style*="display:none"])):not(:has([style*="display: none"] .notifications-page)):not(:has([style*="display:none"] .notifications-page)) {
          height: 100dvh;
          max-height: 100dvh;
          overflow: hidden;
        }
        .app-body:has(.notifications-page:not([style*="display: none"]):not([style*="display:none"])):not(:has([style*="display: none"] .notifications-page)):not(:has([style*="display:none"] .notifications-page)) .site-footer {
          display: none !important;
        }
        .app-main:has(.notifications-page:not([style*="display: none"]):not([style*="display:none"])):not(:has([style*="display: none"] .notifications-page)):not(:has([style*="display:none"] .notifications-page)) {
          display: flex;
          flex-direction: column;
          flex: 1 1 auto;
          min-height: 0;
          overflow: hidden;
          padding-block: 1rem 0 !important;
        }
        @media (max-width: 767px) {
          .app-main:has(.notifications-page:not([style*="display: none"]):not([style*="display:none"])):not(:has([style*="display: none"] .notifications-page)):not(:has([style*="display:none"] .notifications-page)) {
            padding-block: 0.5rem 0 !important;
          }
        }
      `}</style>
      <h1 className='sr-only'>Updates</h1>

      <nav
        className='notifications-filters'
        aria-label='Filter notifications'
        style={{
          flex: '0 0 auto',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'var(--background)',
        }}
      >
        {FILTERS.map((filter) => (
          <Link
            key={filter.id}
            href={filter.id === 'all' ? '/notifications' : `/notifications?filter=${filter.id}`}
            scroll={false}
            className={`notification-filter${activeFilter === filter.id ? ' is-active' : ''}`}
            aria-current={activeFilter === filter.id ? 'page' : undefined}
          >
            {filter.label}
            {activeFilter === filter.id && (
              <TabIndicator groupId='notification-filters' className='notification-filter-indicator' />
            )}
          </Link>
        ))}
      </nav>

      <div
        className='notifications-content'
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          paddingTop: '0.75rem',
          paddingBottom: '1.5rem',
        }}
      >
        {filteredNotifications.length > 0 ? (
          <Stagger as='ul' className='notification-feed'>
            {filteredNotifications.map((notification, index) => {
              const conversationId =
                typeof notification.payload.conversation_id === 'string'
                  ? notification.payload.conversation_id
                  : null;
              const listingId =
                typeof notification.payload.listing_id === 'string'
                  ? notification.payload.listing_id
                  : conversationId
                    ? conversationsById.get(conversationId)?.listing_id ?? null
                    : null;
              const cover = listingId ? listingsById.get(listingId)?.cover ?? null : null;

              return (
                <StaggerItem key={notification.id} as='li' index={index}>
                  <Link
                    href={notificationHref(notification)}
                    className={`notification-feed-item${notification.read_at ? '' : ' is-unread'}`}
                  >
                    <span className='notification-feed-thumb' aria-hidden='true'>
                      {cover ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={cover} alt='' />
                      ) : (
                        <NotificationIcon type={notification.type} />
                      )}
                    </span>
                    <span className='notification-feed-copy'>
                      {renderNotificationCopy(
                        notification,
                        user.id,
                        listingsById,
                        conversationsById,
                        offersByListingId
                      )}
                    </span>
                    <span className='notification-feed-time'>
                      <TimeAgo timestamp={notification.created_at} />
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        ) : (
          <EmptyState
            title={emptyTitle}
            hint={emptyHint}
            href={visibleNotifications.length ? '/notifications' : '/laptops'}
            action={visibleNotifications.length ? 'View all updates' : 'Browse laptops'}
          />
        )}
      </div>
    </div>
  );
}
