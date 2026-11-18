import { apiUser, json } from '@/lib/api';
import { detectScamPhrases } from '@/lib/scam';
import { createAdminClient } from '@/lib/supabase/admin';
import { withinLimit } from '@/lib/usage';
import { secondsUntilDailyReset } from '@/lib/usage-policy';
import {
  isAllowedMessageAttachment,
  MESSAGE_ATTACHMENT_MAX_COUNT,
  MESSAGE_ATTACHMENT_MAX_TOTAL_SIZE,
} from '@/lib/messages/attachments';
import { randomUUID } from 'node:crypto';

export async function GET() {
  const { supabase, user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);
  if (profile?.role === 'admin') return json({ error: 'Admin accounts cannot use marketplace messaging.' }, 403);
  if (profile?.status !== 'active') return json({ error: 'Your account is suspended.' }, 403);

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

  if (error) {
    console.error('Could not load conversations:', error.message);
    return json({ error: 'Could not load conversations.' }, 500);
  }

  return json({ conversations: convs || [] });
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);
  if (profile?.role === 'admin') return json({ error: 'Admin accounts cannot use marketplace messaging.' }, 403);
  if (profile?.status !== 'active') return json({ error: 'Your account is suspended.' }, 403);

  const contentLengthHeader = request.headers.get('content-length');
  const contentLength = contentLengthHeader === null ? null : Number(contentLengthHeader);
  if (contentLength !== null && (!Number.isSafeInteger(contentLength) || contentLength < 0 || contentLength > MESSAGE_ATTACHMENT_MAX_TOTAL_SIZE + 128 * 1024)) {
    return json({ error: 'Attachments and message must be 4 MB or smaller.' }, 413);
  }

  const limit = await withinLimit(user.id, 'message');
  if (limit === 'unavailable') {
    return json({ error: 'We could not verify your message limit. Please try again shortly.' }, 503, { 'Retry-After': '60' });
  }
  if (limit === 'limited') {
    return json({ error: 'Daily message limit reached.' }, 429, { 'Retry-After': String(secondsUntilDailyReset()) });
  }

  let conversationId: unknown;
  let body: unknown;
  let files: File[] = [];
  if (request.headers.get('content-type')?.includes('multipart/form-data')) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return json({ error: 'Could not read the message and attachments.' }, 400);
    }
    conversationId = form.get('conversationId');
    body = form.get('body');
    const rawFiles = form.getAll('attachments');
    if (rawFiles.some((value) => !(value instanceof File))) {
      return json({ error: 'Attachments must be uploaded as files.' }, 400);
    }
    files = rawFiles.filter((value): value is File => value instanceof File);
  } else {
    try {
      const payload = await request.json();
      conversationId = payload.conversationId;
      body = payload.body;
    } catch {
      return json({ error: 'Invalid message request.' }, 400);
    }
  }

  if (
    typeof conversationId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId) ||
    typeof body !== 'string'
  ) {
    return json({ error: 'Message body and conversationId are required.' }, 400);
  }
  if (!body.trim() && files.length === 0) {
    return json({ error: 'Write a message or attach a file.' }, 400);
  }
  if (body.trim().length > 2000) {
    return json({ error: 'Messages must be 2,000 characters or fewer.' }, 400);
  }
  if (files.length > MESSAGE_ATTACHMENT_MAX_COUNT) {
    return json({ error: `Attach up to ${MESSAGE_ATTACHMENT_MAX_COUNT} files per message.` }, 400);
  }
  if (files.some((file) => !isAllowedMessageAttachment(file))) {
    return json({
      error: 'Use non-empty images, PDF, text, CSV, Word, or Excel files up to 4 MB each.',
    }, 400);
  }
  if (files.reduce((total, file) => total + file.size, 0) > MESSAGE_ATTACHMENT_MAX_TOTAL_SIZE) {
    return json({ error: 'Attachments must be 4 MB or smaller in total.' }, 400);
  }

  // Verify user belongs to this conversation
  const { data: conv, error: conversationError } = await supabase
    .from('conversations')
    .select('id, buyer_id, seller_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (conversationError) {
    console.error('Could not verify chat conversation:', conversationError.message);
    return json({ error: 'Could not verify the conversation.' }, 500);
  }
  if (!conv || (conv.buyer_id !== user.id && conv.seller_id !== user.id)) {
    return json({ error: 'Conversation not found.' }, 404);
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error('Could not initialize chat storage:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Messaging is temporarily unavailable.' }, 503, { 'Retry-After': '60' });
  }
  const storage = admin.storage.from('message-attachments');
  const uploadedPaths: string[] = [];
  const attachments: { path: string; name: string; contentType: string; size: number }[] = [];

  for (const file of files) {
    const safeName = file.name.replace(/[\\/\u0000-\u001f\u007f]/g, '_').slice(0, 120) || 'attachment';
    const path = `${conversationId}/${randomUUID()}-${safeName}`;
    const { error: uploadError } = await storage.upload(
      path,
      Buffer.from(await file.arrayBuffer()),
      { contentType: file.type, upsert: false }
    );
    if (uploadError) {
      console.error('Could not upload chat attachment:', uploadError.message);
      if (uploadedPaths.length) {
        const { error: cleanupError } = await storage.remove(uploadedPaths);
        if (cleanupError) console.error('Could not clean up chat attachments:', cleanupError.message);
      }
      return json({ error: 'Could not upload an attachment. Please try again.' }, 503, { 'Retry-After': '60' });
    }
    uploadedPaths.push(path);
    attachments.push({
      path,
      name: file.name.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200) || 'Attachment',
      contentType: file.type,
      size: file.size,
    });
  }

  const messageBody = body.trim() || (files.length === 1 ? 'Shared an attachment' : `Shared ${files.length} attachments`);
  const scamFlags = detectScamPhrases(messageBody);
  const isFlagged = scamFlags.length > 0;

  // Message inserts are server-only so clients cannot bypass the scam checks.
  const { data: message, error: msgError } = await admin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: messageBody,
      ...(attachments.length > 0 ? { attachments } : {}),
      is_flagged: isFlagged,
    })
    .select('*')
    .single();

  if (msgError) {
    if (uploadedPaths.length) {
      const { error: cleanupError } = await storage.remove(uploadedPaths);
      if (cleanupError) console.error('Could not clean up chat attachments:', cleanupError.message);
    }
    if (attachments.length > 0 && msgError.message.includes("Could not find the 'attachments' column")) {
      return json({
        error: 'File uploads are not set up yet. Run supabase/07_message_attachments.sql in Supabase; text messages can still be sent.',
      }, 503, { 'Retry-After': '300' });
    }
    console.error('Could not save chat message:', msgError.message);
    return json({ error: 'Could not send this message.' }, 500);
  }

  // If flagged, log a chat alert for the admin team
  if (isFlagged && message) {
    const { error: alertError } = await admin.from('chat_alerts').insert({
      message_id: message.id,
      matched_phrases: scamFlags,
    });
    if (alertError) console.error('Could not save chat scam alert:', alertError.message);
  }

  return json({ message, flagged: isFlagged }, 201);
}
