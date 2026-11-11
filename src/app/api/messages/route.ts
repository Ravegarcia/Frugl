import { apiUser, json } from '@/lib/api';
import { detectScamPhrases } from '@/lib/scam';
import { withinLimit } from '@/lib/usage';

export async function GET(request: Request) {
  const { supabase, user } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);

  // Get user's conversations
  const { data: convs, error } = await supabase
    .from('conversations')
    .select(`
      id,
      listing_id,
      buyer_id,
      seller_id,
      created_at,
      updated_at,
      listings (id, title, price, listing_photos(image_url, sort_order)),
      buyer:profiles!conversations_buyer_id_fkey(id, name, avatar_url),
      seller:profiles!conversations_seller_id_fkey(id, name, avatar_url),
      messages (id, body, sent_at, read_at, sender_id)
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  if (error) return json({ error: error.message }, 400);

  return json({ conversations: convs || [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);

  if (!(await withinLimit(user.id, 'message'))) {
    return json({ error: 'Daily message limit reached.' }, 429);
  }

  const { conversationId, body } = await request.json();
  if (!conversationId || !body || typeof body !== 'string' || !body.trim()) {
    return json({ error: 'Message body and conversationId are required.' }, 400);
  }

  // Verify user belongs to this conversation
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, buyer_id, seller_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (!conv || (conv.buyer_id !== user.id && conv.seller_id !== user.id)) {
    return json({ error: 'Conversation not found.' }, 404);
  }

  // Scan for scam phrases
  const scamFlags = detectScamPhrases(body);
  const isFlagged = scamFlags.length > 0;

  // Insert message
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: body.trim(),
      is_flagged: isFlagged,
    })
    .select('*')
    .single();

  if (msgError) return json({ error: msgError.message }, 400);

  // If flagged, log chat alert for moderators
  if (isFlagged && message) {
    await supabase.from('chat_alerts').insert({
      message_id: message.id,
      matched_phrases: scamFlags,
    });
  }

  return json({ message, flagged: isFlagged });
}
