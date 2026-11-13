'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/constants';
import { coverUrl } from '@/lib/queries';
import TimeAgo from '@/components/TimeAgo';
import { detectScamPhrases } from '@/lib/scam';
import { Send, AlertTriangle, ShieldCheck, Tag } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  conversation: any;
  currentUserId: string;
  initialOffers: any[];
}

export default function ChatRoom({ conversation, currentUserId, initialOffers }: Props) {
  const supabase = createClient();
  const listing = conversation.listings;
  const isBuyer = conversation.buyer_id === currentUserId;
  const otherParty = isBuyer ? conversation.seller : conversation.buyer;
  const cover = coverUrl(listing);

  const [messages, setMessages] = useState<any[]>(
    [...(conversation.messages || [])].sort(
      (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
    )
  );
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [offers, setOffers] = useState<any[]>(initialOffers);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [actionError, setActionError] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to realtime messages on this conversation
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, supabase]);

  // Send message
  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    setSending(true);
    setActionError('');
    const textToSend = inputText.trim();
    setInputText('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          body: textToSend,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message.');

      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch (err: any) {
      setActionError(err.message || 'Error sending message.');
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  }

  // Create offer
  async function handleSendOffer(e: FormEvent) {
    e.preventDefault();
    const amount = Number(offerAmount);
    if (!amount || amount <= 0) return;

    setActionError('');
    try {
      const { data, error } = await supabase
        .from('offers')
        .insert({
          listing_id: conversation.listing_id,
          buyer_id: conversation.buyer_id,
          amount,
        })
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      setOffers((prev) => [data, ...prev]);
      setShowOfferForm(false);
      setOfferAmount('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to send offer.');
    }
  }

  // Handle offer action (accept, decline, withdraw)
  async function handleOfferStatus(offerId: string, status: string) {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ status })
        .eq('id', offerId);

      if (error) throw new Error(error.message);
      setOffers((prev) =>
        prev.map((o) => (o.id === offerId ? { ...o, status } : o))
      );
    } catch (err: any) {
      setActionError(err.message || 'Failed to update offer.');
    }
  }

  const latestOffer = offers[0];

  return (
    <div className='mx-auto max-w-4xl space-y-3'>
      {/* Listing Header Bar */}
      <div className='flex items-center justify-between rounded-xl border bg-white p-3 shadow-sm'>
        <div className='flex items-center gap-3'>
          <div className='h-12 w-12 rounded-lg bg-gray-100 overflow-hidden border'>
            {cover ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={cover} alt='' className='h-full w-full object-cover' />
            ) : (
              <div className='flex h-full items-center justify-center text-[9px] text-gray-400'>
                No photo
              </div>
            )}
          </div>
          <div>
            <Link
              href={`/laptops/${listing.id}`}
              className='text-sm font-semibold text-gray-900 hover:underline line-clamp-1'
            >
              {listing.title}
            </Link>
            <p className='text-xs font-bold text-primary'>
              {formatPrice(listing.price)} · <span className='font-normal text-gray-500 capitalize'>{listing.status}</span>
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {isBuyer && listing.status === 'available' && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowOfferForm(!showOfferForm)}
              className='text-xs'
            >
              <Tag size={14} className='mr-1 text-plum-700' />
              {showOfferForm ? 'Cancel Offer' : 'Make Offer'}
            </Button>
          )}
          <Link
            href={`/sellers/${otherParty?.id}`}
            className='text-xs text-gray-600 hover:underline hidden sm:inline'
          >
            {otherParty?.name}
          </Link>
        </div>
      </div>

      {/* Safety Warning Banner */}
      <div className='flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900'>
        <AlertTriangle size={16} className='text-amber-700 shrink-0' />
        <span>
          <strong>Safety check:</strong> Always meet in a busy public place. Never send downpayments via GCash or share OTP codes in chat.
        </span>
      </div>

      {/* Offer Form / Status Box */}
      {showOfferForm && (
        <form onSubmit={handleSendOffer} className='rounded-xl border bg-white p-4 shadow-sm space-y-2'>
          <div className='flex items-center gap-2'>
            <Input
              type='number'
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder='Enter your offer in PHP'
              className='text-sm'
            />
            <Button type='submit' size='sm'>
              Send Offer
            </Button>
          </div>
        </form>
      )}

      {latestOffer && (
        <div className='flex items-center justify-between rounded-xl border border-lavender-300 bg-lavender-100 p-3 text-xs'>
          <div>
            <span className='font-semibold text-primary'>
              Offer: {formatPrice(latestOffer.amount)}
            </span>
            <span className='ml-2 text-gray-600 capitalize'>({latestOffer.status})</span>
          </div>

          <div className='flex items-center gap-2'>
            {!isBuyer && latestOffer.status === 'pending' && (
              <>
                <button
                  onClick={() => handleOfferStatus(latestOffer.id, 'accepted')}
                  className='min-h-11 rounded-full border border-primary bg-accent px-4 font-medium text-accent-foreground hover:bg-accent-hover'
                >
                  Accept
                </button>
                <button
                  onClick={() => handleOfferStatus(latestOffer.id, 'declined')}
                  className='rounded border border-gray-300 px-2.5 py-1 text-gray-700 hover:bg-gray-100'
                >
                  Decline
                </button>
              </>
            )}
            {isBuyer && latestOffer.status === 'pending' && (
              <button
                onClick={() => handleOfferStatus(latestOffer.id, 'withdrawn')}
                className='text-gray-500 underline'
              >
                Withdraw offer
              </button>
            )}
          </div>
        </div>
      )}

      {actionError && (
        <div className='p-2 text-xs text-red-600 bg-red-50 rounded border border-red-200'>
          {actionError}
        </div>
      )}

      {/* Chat Messages Log */}
      <div className='min-h-[350px] max-h-[500px] overflow-y-auto rounded-xl border bg-white p-4 space-y-3 shadow-inner'>
        {messages.length === 0 ? (
          <div className='flex h-48 flex-col items-center justify-center text-center text-xs text-gray-400 space-y-1'>
            <ShieldCheck size={28} className='text-gray-300' />
            <p>Direct chat for this listing.</p>
            <p>Agree on a public meet-up location and inspect before buying.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === currentUserId;
            const flags = detectScamPhrases(m.body);

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                    isMe
                      ? 'bg-secondary text-primary rounded-br-none'
                      : 'bg-ivory text-primary rounded-bl-none'
                  }`}
                >
                  <p className='whitespace-pre-wrap break-words'>{m.body}</p>
                </div>

                {/* Inline scam phrase detection warning for recipient */}
                {!isMe && flags.length > 0 && (
                  <div className='mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded'>
                    <AlertTriangle size={12} />
                    <span>Warning: Potential scam keyword detected ({flags.join(', ')}).</span>
                  </div>
                )}

                <span className='mt-0.5 text-[10px] text-gray-400'>
                  <TimeAgo timestamp={m.sent_at} />
                </span>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Message Box */}
      <form onSubmit={handleSendMessage} className='flex items-center gap-2'>
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder='Type a message...'
          className='flex-1 rounded-full'
          disabled={sending}
        />
        <Button
          type='submit'
          disabled={sending || !inputText.trim()}
          aria-label='Send message'
          className='h-11 w-11 shrink-0 rounded-full p-2.5'
        >
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}
