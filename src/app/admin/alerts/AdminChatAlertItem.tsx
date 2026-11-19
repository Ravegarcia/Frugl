'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ExternalLink } from '@/components/icons';
import { Button } from '@/components/ui/button';
import TimeAgo from '@/components/TimeAgo';
import { createClient } from '@/lib/supabase/client';

type AlertStatus = 'open' | 'resolved' | 'dismissed';

type AdminChatAlert = {
  id: string;
  status?: AlertStatus;
  resolved_by?: string | null;
  created_at: string;
  matched_phrases: string[] | null;
  messages: {
    body: string | null;
    conversation_id: string | null;
    sender: { name: string | null } | null;
  } | null;
};

export default function AdminChatAlertItem({
  alert,
  showStatus,
  readOnly = false,
}: {
  alert: AdminChatAlert;
  showStatus: boolean;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<AlertStatus>(alert.status ?? 'open');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const message = alert.messages;
  const matchedPhrases = alert.matched_phrases ?? [];

  async function updateStatus(nextStatus: Exclude<AlertStatus, 'open'>) {
    setBusy(true);
    setActionError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);
      if (!user) throw new Error('You must be signed in to update scam alerts.');

      const { data: updated, error } = await supabase
        .from('chat_alerts')
        .update({
          status: nextStatus,
          resolved_by: alert.resolved_by ?? user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alert.id)
        .eq('status', 'open')
        .select('id')
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!updated) throw new Error('This alert has already been updated. Refresh the queue.');
      setStatus(nextStatus);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update this scam alert.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className='admin-card admin-chat-alert' aria-busy={busy}>
      <header className='admin-chat-alert-header'>
        <div className='admin-chat-alert-sender'>
          <span className='admin-chat-alert-icon' aria-hidden='true'>
            <AlertTriangle size={17} />
          </span>
          <div className='admin-chat-alert-sender-info'>
            <div className='admin-chat-alert-sender-heading'>
              <strong>{message?.sender?.name || 'Unknown sender'}</strong>
              {showStatus && <span className={`admin-report-status is-${status}`}>{status}</span>}
            </div>
            <p>Flagged <TimeAgo timestamp={alert.created_at} /></p>
          </div>
        </div>

        {message?.conversation_id ? (
          <Link
            href={`/messages/${message.conversation_id}`}
            target='_blank'
            rel='noopener noreferrer'
            className='admin-chat-alert-link'
          >
            Open conversation <ExternalLink size={14} />
          </Link>
        ) : (
          <span className='admin-chat-alert-unavailable'>Conversation unavailable</span>
        )}
      </header>

      <div className='admin-chat-alert-message'>
        <p className='admin-chat-alert-label'>Flagged message</p>
        <blockquote>{message?.body || 'Message content unavailable.'}</blockquote>
      </div>

      <div className='admin-chat-alert-indicators'>
        <div className='admin-chat-alert-indicators-heading'>
          <p className='admin-chat-alert-label'>Matched keywords</p>
          <span>{matchedPhrases.length}</span>
        </div>
        {matchedPhrases.length ? (
          <div className='admin-chat-alert-phrases'>
            {matchedPhrases.map((phrase, index) => (
              <span key={`${phrase}-${index}`}>{phrase}</span>
            ))}
          </div>
        ) : (
          <p className='admin-chat-alert-no-indicators'>No matched keywords were provided.</p>
        )}
      </div>

      {status === 'open' && !readOnly && (
        <footer className='admin-chat-alert-actions'>
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={busy}
            className='admin-queue-action'
            onClick={() => void updateStatus('dismissed')}
          >
            Dismiss
          </Button>
          <Button
            type='button'
            size='sm'
            disabled={busy}
            className='admin-queue-action is-resolve'
            onClick={() => void updateStatus('resolved')}
          >
            Mark resolved
          </Button>
        </footer>
      )}
      {actionError && <p className='admin-queue-action-error' role='alert'>{actionError}</p>}
    </article>
  );
}
