import { connection } from 'next/server';
import { requireMarketplaceUser } from '@/lib/auth';
import Link from 'next/link';
import EmptyState from '@/components/EmptyState';
import TimeAgo from '@/components/TimeAgo';

export default async function NotificationsPage() {
  await connection();
  const { supabase, user } = await requireMarketplaceUser('/notifications');

  // Fetch notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(40);

  // Mark all unread as read
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);

  function notifLink(n: any) {
    if (n.type === 'message') return `/messages/${n.payload?.conversation_id}`;
    if (n.type === 'offer' || n.type === 'offer_update') return '/offers';
    if (n.payload?.listing_id) return `/laptops/${n.payload.listing_id}`;
    return '#';
  }

  function notifText(n: any) {
    switch (n.type) {
      case 'offer':
        return `New offer of ₱${Number(n.payload?.amount || 0).toLocaleString()} received on "${n.payload?.title || 'your listing'}".`;
      case 'offer_update':
        return `Your offer on "${n.payload?.title || 'listing'}" was updated to: ${n.payload?.status}.`;
      case 'message':
        return 'You have received a new chat message regarding a laptop listing.';
      case 'listing_reserved':
        return `Listing "${n.payload?.title}" has been reserved for you.`;
      case 'listing_sold':
        return `Listing "${n.payload?.title}" was marked sold.`;
      default:
        return 'You have a new update.';
    }
  }

  return (
    <div className='utility-page'>
      <header className='utility-page-heading'>
        <h1 className='text-2xl font-bold text-gray-900'>Notifications</h1>
        <p className='text-sm text-gray-500'>Updates on messages, offers, holds, and sales.</p>
      </header>

      {notifications && notifications.length > 0 ? (
        <div className='divide-y rounded-xl border bg-white shadow-sm overflow-hidden'>
          {notifications.map((n: any) => (
            <Link
              key={n.id}
              href={notifLink(n)}
              className='block p-4 hover:bg-gray-50 transition'
            >
              <div className='flex items-start justify-between gap-2'>
                <p className='text-sm text-gray-800'>{notifText(n)}</p>
                <span className='text-xs text-gray-400 shrink-0'><TimeAgo timestamp={n.created_at} /></span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title='No notifications'
          hint='When you receive offers, messages, or listing updates, they will appear here.'
          href='/laptops'
          action='Browse laptops'
        />
      )}
    </div>
  );
}
