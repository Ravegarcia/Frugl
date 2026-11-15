import { connection } from 'next/server';
import { requireMarketplaceUser } from '@/lib/auth';
import InboxShell from './InboxShell';

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const { supabase, user } = await requireMarketplaceUser('/messages');

  const { data: conversations, error } = await supabase
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

  if (error) console.error('Could not load inbox conversations:', error.message);

  const inboxConversations = (conversations ?? []).map((conversation: any) => {
    const messages = [...(conversation.messages ?? [])].sort(
      (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
    );
    return {
      ...conversation,
      latestMessage: messages[0] ?? null,
      hasUnread: messages.some(
        (message) => message.sender_id !== user.id && !message.read_at
      ),
      messages: undefined,
    };
  });

  return (
    <InboxShell
      conversations={inboxConversations}
      currentUserId={user.id}
      loadError={error ? 'Your conversations could not be loaded. Please refresh the page.' : ''}
    >
      {children}
    </InboxShell>
  );
}
