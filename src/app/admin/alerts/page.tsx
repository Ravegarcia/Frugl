import { requireStaff } from '@/lib/auth';
import Link from 'next/link';
import EmptyState from '@/components/EmptyState';
import { AlertTriangle } from '@/components/icons';
import TimeAgo from '@/components/TimeAgo';

export default async function AdminAlertsPage() {
  const { supabase } = await requireStaff();

  // Fetch flagged chat alerts
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
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Scam Chat Alerts</h1>
          <p className='text-sm text-gray-500'>Messages automatically flagged by the scam-detection engine.</p>
        </div>
        <Link href='/admin' className='text-xs text-gray-500 underline'>
          Back to Admin Hub
        </Link>
      </div>

      {alerts && alerts.length > 0 ? (
        <div className='divide-y rounded-xl border bg-white shadow-sm overflow-hidden'>
          {alerts.map((a: any) => {
            const msg = a.messages;
            return (
              <div key={a.id} className='p-4 space-y-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <AlertTriangle size={16} className='text-amber-600' />
                    <span className='font-semibold text-xs text-gray-800'>
                      Sender: {msg?.sender?.name || 'Unknown'}
                    </span>
                    <span className='text-xs text-gray-400'>· <TimeAgo timestamp={a.created_at} /></span>
                  </div>
                  <Link
                    href={`/messages/${msg?.conversation_id}`}
                    target='_blank'
                    className='text-xs text-emerald-700 underline font-medium'
                  >
                    Open Conversation ↗
                  </Link>
                </div>

                <div className='rounded bg-gray-50 p-2.5 text-xs text-gray-800 border'>
                  &ldquo;{msg?.body}&rdquo;
                </div>

                <div className='flex items-center gap-1.5 text-xs text-red-700'>
                  <span className='font-semibold'>Matched keywords:</span>
                  {(a.matched_phrases || []).map((p: string, i: number) => (
                    <span key={i} className='rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-mono'>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title='No chat alerts'
          hint='No suspicious off-platform payment or scam keywords have been triggered.'
        />
      )}
    </div>
  );
}
