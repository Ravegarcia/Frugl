import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import { coverUrl } from '@/lib/queries';
import EmptyState from '@/components/EmptyState';

export default async function MessagesPage() {
  const { supabase, user } = await requireUser('/messages');

  // Fetch all conversations for user
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      id,
      listing_id,
      buyer_id,
      seller_id,
      updated_at,
      listings (id, title, price, status, listing_photos(image_url, sort_order)),
      buyer:profiles!conversations_buyer_id_fkey(id, name, avatar_url),
      seller:profiles!conversations_seller_id_fkey(id, name, avatar_url),
      messages (id, body, sent_at, read_at, sender_id)
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  return (
    <div className='mx-auto max-w-3xl space-y-4'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>Messages</h1>
        <p className='text-sm text-gray-500'>Chats with buyers and sellers regarding laptop listings.</p>
      </div>

      {conversations && conversations.length > 0 ? (
        <div className='divide-y rounded-xl border bg-white shadow-sm overflow-hidden'>
          {conversations.map((c: any) => {
            const isBuyer = c.buyer_id === user.id;
            const otherParty = isBuyer ? c.seller : c.buyer;
            const listing = c.listings;
            const img = coverUrl(listing);
            const messages = [...(c.messages || [])].sort(
              (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
            );
            const latestMsg = messages[0];
            const hasUnread = messages.some((m) => m.sender_id !== user.id && !m.read_at);

            return (
              <Link
                key={c.id}
                href={`/messages/${c.id}`}
                className='flex items-center gap-4 p-4 hover:bg-gray-50 transition'
              >
                {/* Laptop photo */}
                <div className='h-14 w-14 shrink-0 rounded-lg bg-gray-100 overflow-hidden border'>
                  {img ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={img} alt='' className='h-full w-full object-cover' />
                  ) : (
                    <div className='flex h-full items-center justify-center text-[10px] text-gray-400'>
                      No photo
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className='min-w-0 flex-1 space-y-0.5'>
                  <div className='flex items-center justify-between'>
                    <p className='font-semibold text-sm text-gray-900'>
                      {otherParty?.name || 'User'}
                      <span className='ml-2 text-xs font-normal text-gray-400'>
                        ({isBuyer ? 'Seller' : 'Buyer'})
                      </span>
                    </p>
                    <span className='text-xs text-gray-400'>
                      {timeAgo(latestMsg?.sent_at || c.updated_at)}
                    </span>
                  </div>

                  <p className='truncate text-xs font-medium text-emerald-800'>
                    {listing?.title || 'Listing'}
                  </p>

                  <p className='truncate text-xs text-gray-600'>
                    {latestMsg ? latestMsg.body : 'No messages yet'}
                  </p>
                </div>

                {hasUnread && (
                  <span className='h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600' />
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title='No messages yet'
          hint='When you message a seller or buyers inquire about your laptop, your chats will appear here.'
          href='/laptops'
          action='Browse laptops'
        />
      )}
    </div>
  );
}
