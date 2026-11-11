'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Laptop, ShieldCheck, Sparkles } from '@/components/icons';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

const TITLES: Record<Mode, string> = {
  login: 'Welcome back',
  register: 'Create your account',
  forgot: 'Reset your password',
  reset: 'Choose a new password',
};

const DESCRIPTIONS: Record<Mode, string> = {
  login: 'Sign in to message sellers and manage your listings.',
  register: 'Save laptops, message sellers, and list your own.',
  forgot: 'Enter the email address linked to your account and we’ll send a reset link.',
  reset: 'Choose a new password for your Frugl account.',
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
      else window.location.assign(next);
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
        else if (data.session) window.location.assign(next);
        else setMessage('Check your email and click the verification link to finish signing up.');
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
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback(next) },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <div className='auth-layout'>
      <aside className='auth-aside'>
        <Link href='/' className='auth-brand'>Frugl</Link>
        <div>
          <span className='auth-aside-icon'><Laptop size={22} /></span>
          <h2>Find a laptop worth keeping.</h2>
          <p>Thoughtful listings, useful specs, and a community ready to help you choose well.</p>
        </div>
        <div className='auth-trust-note'>
          <ShieldCheck size={18} />
          <span>Browse freely. Sign in when you’re ready to connect.</span>
        </div>
      </aside>

      <section className='auth-card' aria-labelledby='auth-title'>
        <div className='auth-card-heading'>
          <Link href='/' className='auth-mobile-brand'>Frugl</Link>
          <p className='auth-eyebrow'><Sparkles size={13} /> Your next laptop starts here</p>
          <h1 id='auth-title'>{TITLES[mode]}</h1>
          <p>{DESCRIPTIONS[mode]}</p>
        </div>

        {(mode === 'login' || mode === 'register') && (
          <>
            <Button type='button' variant='outline' className='auth-google-button' onClick={google} disabled={busy}>
              <span className='google-mark' aria-hidden='true'>G</span>
              Continue with Google
            </Button>
            <div className='auth-divider'><span>or continue with email</span></div>
          </>
        )}

        <form onSubmit={submit} className='auth-form'>
          {mode === 'register' && (
            <div className='auth-field'>
              <Label htmlFor='name'>Your name</Label>
              <Input id='name' name='name' autoComplete='name' value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          {mode !== 'reset' && (
            <div className='auth-field'>
              <Label htmlFor='email'>Email address</Label>
              <Input
                id='email'
                name='email'
                type='email'
                autoComplete='email'
                inputMode='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}
          {mode !== 'forgot' && (
            <div className='auth-field'>
              <div className='auth-password-label'>
                <Label htmlFor='password'>{mode === 'reset' ? 'New password' : 'Password'}</Label>
                {mode === 'login' && <Link href='/forgot-password'>Forgot password?</Link>}
              </div>
              <Input
                id='password'
                name='password'
                type='password'
                autoComplete={mode === 'register' || mode === 'reset' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={mode === 'register' || mode === 'reset' ? 8 : undefined}
                required
              />
              {(mode === 'register' || mode === 'reset') && <span className='auth-field-hint'>Use at least 8 characters.</span>}
            </div>
          )}
          {error && <p className='auth-message auth-error' role='alert'>{error}</p>}
          {message && <p className='auth-message auth-success' role='status'>{message}</p>}
          <Button type='submit' className='auth-submit' disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : TITLES[mode]}
          </Button>
        </form>

        <div className='auth-switch'>
          {mode === 'login' && (
            <p>New to Frugl? <Link href={'/register?next=' + encodeURIComponent(next)}>Create an account</Link></p>
          )}
          {mode === 'register' && (
            <p>Already have an account? <Link href={'/login?next=' + encodeURIComponent(next)}>Sign in</Link></p>
          )}
          {mode === 'forgot' && <p><Link href='/login'>Back to sign in</Link></p>}
        </div>
        {(mode === 'login' || mode === 'register') && (
          <p className='auth-privacy-note'>By continuing, you agree to use Frugl respectfully and keep your account details safe.</p>
        )}
      </section>
    </div>
  );
}
