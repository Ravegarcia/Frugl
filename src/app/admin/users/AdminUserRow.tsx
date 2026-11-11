'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import TimeAgo from '@/components/TimeAgo';
export default function AdminUserRow({ user, currentRole }: { user: any; currentRole: string }) {
  const supabase = createClient();
  const [status, setStatus] = useState(user.status);
  const [verified, setVerified] = useState(user.seller_verified);
  const [role, setRole] = useState(user.role);
  const [busy, setBusy] = useState(false);

  const isAdmin = currentRole === 'admin';

  async function toggleSuspend() {
    setBusy(true);
    const next = status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase.from('profiles').update({ status: next }).eq('id', user.id);
    if (!error) setStatus(next);
    setBusy(false);
  }

  async function toggleVerify() {
    setBusy(true);
    const next = !verified;
    const { error } = await supabase.from('profiles').update({ seller_verified: next }).eq('id', user.id);
    if (!error) setVerified(next);
    setBusy(false);
  }

  async function changeRole(newRole: string) {
    if (!isAdmin) return;
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
    if (!error) setRole(newRole);
    setBusy(false);
  }

  return (
    <div className='flex flex-wrap items-center justify-between gap-3 p-4'>
      <div>
        <div className='flex items-center gap-2'>
          <p className='font-semibold text-sm text-gray-900'>{user.name || 'Unnamed'}</p>
          {verified && <span className='text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded'>Verified Seller</span>}
          <span className={`text-[11px] font-mono uppercase px-1.5 py-0.5 rounded ${status === 'active' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'}`}>
            {status}
          </span>
        </div>
        <p className='text-xs text-gray-400'>
          Joined <TimeAgo timestamp={user.created_at} /> · Location: {user.default_location || 'Not set'}
        </p>
      </div>

      <div className='flex items-center gap-2'>
        {isAdmin && (
          <select
            value={role}
            disabled={busy}
            onChange={(e) => changeRole(e.target.value)}
            className='rounded border bg-white px-2 py-1 text-xs text-gray-700'
          >
            <option value='buyer'>Buyer</option>
            <option value='seller'>Seller</option>
            <option value='moderator'>Moderator</option>
            <option value='admin'>Admin</option>
          </select>
        )}

        <button
          onClick={toggleVerify}
          disabled={busy}
          title={verified ? 'Remove verified badge' : 'Grant verified badge'}
          className={`rounded border px-2.5 py-1 text-xs font-medium transition ${
            verified ? 'border-emerald-600 text-emerald-700 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
          }`}
        >
          {verified ? 'Verified' : 'Verify'}
        </button>

        <button
          onClick={toggleSuspend}
          disabled={busy}
          className={`rounded border px-2.5 py-1 text-xs font-medium transition ${
            status === 'active' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {status === 'active' ? 'Suspend' : 'Activate'}
        </button>
      </div>
    </div>
  );
}
