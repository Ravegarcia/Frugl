'use client';

import { useState } from 'react';
import TimeAgo from '@/components/TimeAgo';
import { createClient } from '@/lib/supabase/client';

type ManageableRole = 'buyer' | 'admin';

type AdminUser = {
  id: string;
  name: string | null;
  status: string;
  seller_verified: boolean;
  role: string;
  created_at: string;
  default_location: string | null;
};

const roleOptions: { value: ManageableRole; label: string }[] = [
  { value: 'buyer', label: 'Buyer / Seller' },
  { value: 'admin', label: 'Admin' },
];

function isManageableRole(role: string): role is ManageableRole {
  return roleOptions.some((option) => option.value === role);
}

export default function AdminUserRow({
  user,
  currentRole,
  currentUserId,
}: {
  user: AdminUser;
  currentRole: string;
  currentUserId: string;
}) {
  const supabase = createClient();
  const [status, setStatus] = useState(user.status);
  const [verified, setVerified] = useState(user.seller_verified);
  const [role, setRole] = useState<ManageableRole>(
    isManageableRole(user.role) ? user.role : 'buyer',
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isAdmin = currentRole === 'admin';
  const isSelf = user.id === currentUserId;
  const canManageAccount = isAdmin && !isSelf;
  const displayName = user.name?.trim() || 'Unnamed account';
  const initials = displayName === 'Unnamed account'
    ? 'U'
    : displayName.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();

  async function updateProfile(
    update: () => PromiseLike<{ error: { message: string } | null }>,
    onSuccess: () => void,
  ) {
    setBusy(true);
    setActionError(null);
    try {
      const { error } = await update();
      if (error) {
        setActionError(error.message);
        return;
      }
      onSuccess();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update this account.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleSuspend() {
    const next = status === 'active' ? 'suspended' : 'active';
    await updateProfile(
      () => supabase.from('profiles').update({ status: next }).eq('id', user.id),
      () => setStatus(next),
    );
  }

  async function toggleVerify() {
    const next = !verified;
    await updateProfile(
      () => supabase.from('profiles').update({ seller_verified: next }).eq('id', user.id),
      () => setVerified(next),
    );
  }

  async function changeRole(newRole: ManageableRole) {
    if (!isAdmin) return;
    await updateProfile(
      () => supabase.from('profiles').update({ role: newRole }).eq('id', user.id),
      () => setRole(newRole),
    );
  }

  return (
    <article className={`admin-member-row ${status === 'active' ? '' : 'is-suspended'}`} aria-busy={busy}>
      <div className='admin-member-profile'>
        <span className='admin-member-avatar' aria-hidden='true'>{initials}</span>
        <div className='admin-member-details'>
          <div className='admin-member-heading'>
            <strong>{displayName}</strong>
            <span className={`admin-member-status ${status === 'active' ? 'is-active' : 'is-suspended'}`}>
              {status === 'active' ? 'Active' : 'Suspended'}
            </span>
            {verified && <span className='admin-member-verified'>Verified seller</span>}
          </div>
          <p>
            Joined <TimeAgo timestamp={user.created_at} />
            <span aria-hidden='true'> · </span>
            {user.default_location || 'Location not set'}
          </p>
        </div>
      </div>

      <div className='admin-member-actions'>
        {canManageAccount ? (
          <>
            <label className='admin-member-role'>
              <span className='sr-only'>Role for {displayName}</span>
              <select
                value={role}
                disabled={busy}
                onChange={(event) => {
                  if (isManageableRole(event.target.value)) void changeRole(event.target.value);
                }}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <button
              type='button'
              onClick={toggleVerify}
              disabled={busy}
              title={verified ? 'Remove verified badge' : 'Grant verified badge'}
              className={`admin-member-button ${verified ? 'is-verified' : ''}`}
            >
              {verified ? 'Verified' : 'Verify seller'}
            </button>

            <button
              type='button'
              onClick={toggleSuspend}
              disabled={busy}
              className={`admin-member-button ${status === 'active' ? 'is-danger' : 'is-reactivate'}`}
            >
              {status === 'active' ? 'Suspend' : 'Activate'}
            </button>
          </>
        ) : isSelf ? (
          <span className='admin-member-permission-note'>Your account is protected</span>
        ) : null}

        {actionError && <p className='admin-member-error' role='alert'>{actionError}</p>}
      </div>
    </article>
  );
}
