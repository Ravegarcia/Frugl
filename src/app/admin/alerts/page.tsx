import { AlertTriangle, ExternalLink, ShieldCheck } from '@/components/icons';
import TimeAgo from '@/components/TimeAgo';
import { requireStaff } from '@/lib/auth';
import AdminActivityViewed from '../AdminActivityViewed';
import Link from 'next/link';

export default async function AdminAlertsPage() {
  const { supabase } = await requireStaff();

  const { data: alerts } = await supabase
    .from('chat_alerts')
    .select(`
      *,
      messages (
        id,
        body,
        conversation_id,
        sender_id,
        sender:profiles!messages_sender_id_fkey(id, name)
      )
    `)
    .order('created_at', { ascending: false });

  return (
    <main className='admin-alerts-page'>
      <AdminActivityViewed eventType='chat_alert_created' />
      <header className='admin-alerts-header'>
        <div>
          <p className='admin-eyebrow'>Trust &amp; safety</p>
          <h1>Scam chat alerts</h1>
          <p>Messages automatically flagged by Frugl&apos;s scam-detection engine.</p>
          <div className='admin-alerts-header-note'>
            <AlertTriangle size={15} />
            <p>Review the message context before opening the conversation.</p>
          </div>
        </div>
      </header>

      <section className='admin-alerts-section' aria-labelledby='admin-alerts-title'>
        <div className='admin-alerts-section-heading'>
          <div>
            <p className='admin-eyebrow'>Automated monitoring</p>
            <h2 id='admin-alerts-title'>Flagged messages</h2>
          </div>
          <span className={`admin-alerts-count ${alerts?.length ? 'has-alerts' : ''}`}>
            <AlertTriangle size={14} />
            {alerts?.length ?? 0} {alerts?.length === 1 ? 'alert' : 'alerts'}
          </span>
        </div>

        {alerts?.length ? (
          <div className='admin-alerts-list'>
            {alerts.map((alert: any) => {
              const message = alert.messages;
              const matchedPhrases: string[] = alert.matched_phrases ?? [];

              return (
                <article className='admin-chat-alert' key={alert.id}>
                  <header className='admin-chat-alert-header'>
                    <div className='admin-chat-alert-sender'>
                      <span className='admin-chat-alert-icon' aria-hidden='true'>
                        <AlertTriangle size={17} />
                      </span>
                      <div className='admin-chat-alert-sender-info'>
                        <div className='admin-chat-alert-sender-heading'>
                          <strong>{message?.sender?.name || 'Unknown sender'}</strong>
                          <span>Needs review</span>
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
                </article>
              );
            })}
          </div>
        ) : (
          <div className='admin-alerts-empty'>
            <span className='admin-alerts-empty-icon' aria-hidden='true'><ShieldCheck size={23} /></span>
            <p className='admin-eyebrow'>Monitoring is clear</p>
            <h2>No chat alerts</h2>
            <p>No suspicious off-platform payment or scam keywords have been triggered.</p>
          </div>
        )}
      </section>
    </main>
  );
}
