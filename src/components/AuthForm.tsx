'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

const TITLES: Record<Mode, string> = {
  login: 'Sign in',
  register: 'Create your account',
  forgot: 'Forgot your password?',
  reset: 'Set a new password',
};

export default function AuthForm({ mode, next = '/' }: { mode: Mode; next?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const callback = (to: string) => window.location.origin + '/auth/callback?next=' + encodeURIComponent(to);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else {
        router.push(next);
        router.refresh();
      }
    } else if (mode === 'register') {
      if (password.length < 8) {
        setError('Use at least 8 characters for the password.');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: callback('/verify') },
        });
        if (error) setError(error.message);
        else if (data.session) {
          router.push(next);
          router.refresh();
        } else setMessage('Check your email and click the verification link to finish signing up.');
      }
    } else if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callback('/reset-password') });
      if (error) setError(error.message);
      else setMessage('If that email has an account, a reset link is on its way.');
    } else {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setError(error.message);
      else {
        setMessage('Password updated. Taking you home...');
        setTimeout(() => router.push('/'), 1200);
      }
    }
    setBusy(false);
  }

  async function google() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callback(next) } });
  }

  return (
    <div className='mx-auto mt-10 w-full max-w-sm space-y-4 rounded-xl border bg-white p-6'>
      <h1 className='text-xl font-semibold'>{TITLES[mode]}</h1>
      <form onSubmit={submit} className='space-y-3'>
        {mode === 'register' && (
          <div className='space-y-1'>
            <Label htmlFor='name'>Name</Label>
            <Input id='name' value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        {mode !== 'reset' && (
          <div className='space-y-1'>
            <Label htmlFor='email'>Email</Label>
            <Input id='email' type='email' value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        )}
        {mode !== 'forgot' && (
          <div className='space-y-1'>
            <Label htmlFor='password'>{mode === 'reset' ? 'New password' : 'Password'}</Label>
            <Input id='password' type='password' value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
        )}
        {error && <p className='text-sm text-red-600'>{error}</p>}
        {message && <p className='text-sm text-green-700'>{message}</p>}
        <Button type='submit' className='w-full' disabled={busy}>
          {busy ? 'Please wait...' : TITLES[mode]}
        </Button>
      </form>

      {(mode === 'login' || mode === 'register') && (
        <Button type='button' variant='outline' className='w-full' onClick={google}>
          Continue with Google
        </Button>
      )}

      <div className='space-y-1 text-center text-sm text-gray-600'>
        {mode === 'login' && (
          <>
            <p><Link className='underline' href='/forgot-password'>Forgot password?</Link></p>
            <p>No account? <Link className='underline' href='/register'>Sign up</Link></p>
          </>
        )}
        {mode === 'register' && <p>Already have an account? <Link className='underline' href='/login'>Sign in</Link></p>}
        {mode === 'forgot' && <p><Link className='underline' href='/login'>Back to sign in</Link></p>}
      </div>
    </div>
  );
}
