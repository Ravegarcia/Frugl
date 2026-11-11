'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle } from '@/components/icons';

interface Props {
  user: any;
  profile: any;
  contactNumber: string;
}

export default function AccountForm({ user, profile, contactNumber }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(profile?.name || '');
  const [defaultLocation, setDefaultLocation] = useState(profile?.default_location || '');
  const [contact, setContact] = useState(contactNumber);

  // Password update
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setErr('');

    try {
      // Update public profile
      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          default_location: defaultLocation.trim(),
        })
        .eq('id', user.id);

      if (profErr) throw new Error(profErr.message);

      // Upsert private contact
      const { error: privErr } = await supabase
        .from('profile_private')
        .upsert({
          id: user.id,
          contact_number: contact.trim(),
        });

      if (privErr) throw new Error(privErr.message);

      setMsg('Profile information updated successfully.');
      router.refresh();
    } catch (e: any) {
      setErr(e.message || 'Failed to update profile.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setErr('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    setMsg('');
    setErr('');

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setMsg('Password updated successfully.');
      setPassword('');
    } catch (e: any) {
      setErr(e.message || 'Failed to update password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='mx-auto max-w-xl space-y-8'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>Account & Settings</h1>
        <p className='text-sm text-gray-500'>Manage your profile, default location, and security.</p>
      </div>

      {msg && (
        <div className='flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800'>
          <CheckCircle2 size={16} className='shrink-0' />
          <span>{msg}</span>
        </div>
      )}

      {err && (
        <div className='flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
          <AlertCircle size={16} className='shrink-0' />
          <span>{err}</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleProfileSave} className='rounded-xl border bg-white p-6 shadow-sm space-y-4'>
        <h2 className='text-base font-semibold text-gray-900'>Profile Details</h2>

        <div className='space-y-1.5'>
          <Label htmlFor='email'>Email Address</Label>
          <Input id='email' value={user?.email || ''} disabled className='bg-gray-50 text-gray-500' />
          <p className='text-[11px] text-gray-400'>Email cannot be changed directly.</p>
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='name'>Display Name</Label>
          <Input
            id='name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='location'>Default City / Location</Label>
          <Input
            id='location'
            value={defaultLocation}
            onChange={(e) => setDefaultLocation(e.target.value)}
            placeholder='e.g. Quezon City'
          />
          <p className='text-[11px] text-gray-400'>Auto-fills as your listing location.</p>
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='contact'>Contact Number (Private)</Label>
          <Input
            id='contact'
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder='0917-000-0000'
          />
          <p className='text-[11px] text-gray-400'>Never shown publicly to guests.</p>
        </div>

        <Button type='submit' disabled={busy} className='bg-emerald-700 text-white hover:bg-emerald-800'>
          {busy ? 'Saving...' : 'Save Profile'}
        </Button>
      </form>

      {/* Password Reset */}
      <form onSubmit={handlePasswordChange} className='rounded-xl border bg-white p-6 shadow-sm space-y-4'>
        <h2 className='text-base font-semibold text-gray-900'>Change Password</h2>
        <div className='space-y-1.5'>
          <Label htmlFor='newPass'>New Password</Label>
          <Input
            id='newPass'
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder='Min. 8 characters'
            required
          />
        </div>
        <Button type='submit' variant='outline' disabled={busy}>
          Update Password
        </Button>
      </form>
    </div>
  );
}
