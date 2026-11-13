import { notFound, redirect } from 'next/navigation';
import { requireMarketplaceUser } from '@/lib/auth';
import ChatRoom from './ChatRoom';

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireMarketplaceUser(`/messages/${id}`);

  // Fetch conversation, listing, participants, and messages
  const { data: conv } = await supabase
    .from('conversations')
    .select(`
      id,
      listing_id,
      buyer_id,
      seller_id,
      listings (id, title, price, status, location, listing_photos(image_url, sort_order)),
      buyer:profiles!conversations_buyer_id_fkey(id, name, avatar_url, seller_verified),
      seller:profiles!conversations_seller_id_fkey(id, name, avatar_url, seller_verified),
      messages (*)
    `)
    .eq('id', id)
    .maybeSingle();

  if (!conv) notFound();

  // Check if current user is part of this conversation
  if (conv.buyer_id !== user.id && conv.seller_id !== user.id) {
    redirect('/messages');
  }

  // Mark other's unread messages as read
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', id)
    .neq('sender_id', user.id)
    .is('read_at', null);

  // Fetch offers tied to this listing by this buyer
  const { data: offers } = await supabase
    .from('offers')
    .select('*')
    .eq('listing_id', conv.listing_id)
    .eq('buyer_id', conv.buyer_id)
    .order('created_at', { ascending: false });

  return (
    <div className='py-2'>
      <ChatRoom
        conversation={conv}
        currentUserId={user.id}
        initialOffers={offers || []}
      />
    </div>
  );
}
