'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { m } from 'motion/react';
import { duration, ease } from '@/lib/motion';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Laptop, ShieldCheck } from '@/components/icons';
import type { AuthModalMode } from '@/components/AuthModalDialog';
import { safeRedirectPath } from '@/lib/auth/redirect';

type Mode = 'login' | 'register' | 'forgot' | 'reset';
type Presentation = 'page' | 'modal';
type StrengthLevel = 'none' | 'weak' | 'medium' | 'strong';

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

function evaluatePasswordStrength(pw: string): {
  level: 0 | 1 | 2 | 3;
  percent: number;
  color: string;
  textColor: string;
  key: StrengthLevel;
  label: '' | 'Weak' | 'Medium' | 'Strong';
} {
  if (!pw) {
    return { level: 0, percent: 0, color: 'transparent', textColor: 'inherit', key: 'none', label: '' };
  }
  if (pw.length < 8) {
    const pct = pw.length < 4 ? 22 : 36;
    return { level: 1, percent: pct, color: '#ef4444', textColor: '#ef4444', key: 'weak', label: 'Weak' };
  }

  let variety = 0;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) variety += 1;
  if (/\d/.test(pw)) variety += 1;
  if (/[^A-Za-z0-9]/.test(pw)) variety += 1;
  if (pw.length >= 12) variety += 1;

  if (variety >= 2) {
    return { level: 3, percent: 100, color: '#16a34a', textColor: '#16a34a', key: 'strong', label: 'Strong' };
  }
  if (variety === 1) {
    return { level: 2, percent: 68, color: '#f59e0b', textColor: '#d97706', key: 'medium', label: 'Medium' };
  }
  return { level: 1, percent: 36, color: '#ef4444', textColor: '#ef4444', key: 'weak', label: 'Weak' };
}

export default function AuthForm({
  mode,
  next = '/',
  presentation = 'modal',
  onModeChange,
}: {
  mode: Mode;
  next?: string;
  presentation?: Presentation;
  onModeChange?: (nextMode: AuthModalMode) => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const callback = (to: string) =>
    window.location.origin + '/auth/callback?next=' + encodeURIComponent(safeRedirectPath(to));

  const strength = evaluatePasswordStrength(password);
  const needsConfirmPassword = mode === 'register' || mode === 'reset';
  const hasConfirmTyped = confirmPassword.length > 0;
  const passwordsMatch = hasConfirmTyped && password === confirmPassword;
  const passwordsMismatch = hasConfirmTyped && password !== confirmPassword;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
        else {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role,status')
            .eq('id', data.user.id)
            .single();
          if (profileError) {
            setError('We could not confirm your account access. Please try again.');
            const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
            if (signOutError) console.error('Could not clear the unverified local session:', signOutError.message);
          } else if (profile.status !== 'active') {
            const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
            if (signOutError) console.error('Could not clear the suspended local session:', signOutError.message);
            window.location.assign('/account-suspended');
          } else {
            window.location.assign(profile.role === 'admin' ? '/admin' : safeRedirectPath(next));
          }
        }
      } else if (mode === 'register') {
        if (password.length < 8) {
          setError('Use at least 8 characters for the password.');
        } else if (password !== confirmPassword) {
          setError('Passwords do not match.');
        } else {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name }, emailRedirectTo: callback('/') },
          });
          if (error) setError(error.message);
          else if (data.session) window.location.assign(safeRedirectPath(next));
          else setMessage('Check your email and click the verification link to finish signing up.');
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: callback('/reset-password'),
        });
        if (error) setError(error.message);
        else setMessage('If that email has an account, a reset link is on its way.');
      } else if (mode === 'reset') {
        if (password.length < 8) {
          setError('Use at least 8 characters for the password.');
        } else if (password !== confirmPassword) {
          setError('Passwords do not match.');
        } else {
          const { error } = await supabase.auth.updateUser({ password });
          if (error) setError(error.message);
          else {
            setMessage('Password updated. Taking you home...');
            setTimeout(() => router.push('/'), 1200);
          }
        }
      }
    } catch (error) {
      console.error('Authentication request failed:', error);
      setError('Authentication is temporarily unavailable. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callback(next) },
      });
      if (error) setError(error.message);
    } catch (error) {
      console.error('Google sign-in failed:', error);
      setError('Google sign-in is temporarily unavailable. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const switchModeLink = (targetMode: AuthModalMode, href: string, label: string) => {
    if (onModeChange) {
      return (
        <button
          type='button'
          className='auth-inline-action'
          onClick={() => {
            setError('');
            setMessage('');
            setConfirmPassword('');
            onModeChange(targetMode);
          }}
        >
          {label}
        </button>
      );
    }
    return presentation === 'modal' ? (
      <Link href={href} replace>
        {label}
      </Link>
    ) : (
      <a href={href}>{label}</a>
    );
  };

  return (
    <div className={`auth-layout${presentation === 'modal' ? ' auth-layout-modal' : ''}`}>
      {presentation === 'page' && (
        <aside className='auth-aside'>
          <Link href='/' className='auth-brand'>
            Frugl
          </Link>
          <div>
            <span className='auth-aside-icon'>
              <Laptop size={22} />
            </span>
            <h2>Find a laptop worth keeping.</h2>
            <p>
              Thoughtful listings, useful specs, and a community ready to help you choose well.
            </p>
          </div>
          <div className='auth-trust-note'>
            <ShieldCheck size={18} />
            <span>Browse freely. Sign in when you’re ready to connect.</span>
          </div>
        </aside>
      )}

      <section
        className={`auth-card${presentation === 'modal' ? ' auth-card-modal' : ''}`}
        aria-labelledby='auth-title'
      >
        <div className='auth-card-heading'>
          <h1 id='auth-title'>{TITLES[mode]}</h1>
          <p>{DESCRIPTIONS[mode]}</p>
        </div>

        <form onSubmit={submit} className='auth-form'>
          {mode === 'register' && (
            <div className='auth-field'>
              <Label htmlFor='name'>Your name</Label>
              <input
                id='name'
                name='name'
                type='text'
                className='auth-input'
                autoComplete='name'
                placeholder='Enter your name'
                autoFocus={presentation === 'modal'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          {mode !== 'reset' && (
            <div className='auth-field'>
              <Label htmlFor='email'>Email address</Label>
              <input
                id='email'
                name='email'
                type='email'
                className='auth-input'
                autoComplete='email'
                inputMode='email'
                placeholder='you@example.com'
                autoFocus={presentation === 'modal' && mode !== 'register'}
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
                {mode === 'login' &&
                  switchModeLink(
                    'forgot',
                    '/forgot-password?next=' + encodeURIComponent(next),
                    'Forgot password?'
                  )}
                {needsConfirmPassword && (
                  <span className='auth-field-hint'>Min. 8 characters</span>
                )}
              </div>
              <div className='auth-password-input-wrap'>
                <input
                  id='password'
                  name='password'
                  type={showPassword ? 'text' : 'password'}
                  className='auth-input'
                  autoComplete={needsConfirmPassword ? 'new-password' : 'current-password'}
                  placeholder={needsConfirmPassword ? 'Create a password' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={needsConfirmPassword ? 8 : undefined}
                  required
                />
                <button
                  type='button'
                  className='auth-password-toggle'
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {needsConfirmPassword && (
            <div className='auth-field'>
              <div className='auth-password-label'>
                <Label htmlFor='confirmPassword'>Confirm password</Label>
                {hasConfirmTyped && (
                  <span
                    className={`auth-match-status ${
                      passwordsMatch ? 'is-match' : 'is-mismatch'
                    }`}
                  >
                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </span>
                )}
              </div>
              <div className='auth-password-input-wrap'>
                <input
                  id='confirmPassword'
                  name='confirmPassword'
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`auth-input${passwordsMismatch ? ' is-invalid' : ''}`}
                  autoComplete='new-password'
                  placeholder='Re-enter your password'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  aria-invalid={passwordsMismatch}
                  aria-describedby={passwordsMismatch ? 'confirm-password-error' : undefined}
                  required
                />
                <button
                  type='button'
                  className='auth-password-toggle'
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                  }
                  aria-pressed={showConfirmPassword}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div
                className='auth-strength'
                aria-live='polite'
                style={{
                  display: 'grid',
                  gap: '0.2rem',
                  marginTop: '0.25rem',
                  paddingInline: '0.15rem',
                }}
              >
                <div
                  className='auth-strength-track'
                  aria-hidden='true'
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '4px',
                    borderRadius: '9999px',
                    backgroundColor: '#e9e2f0',
                    overflow: 'hidden',
                  }}
                >
                  <m.span
                    className={`auth-strength-fill is-${strength.key}`}
                    style={{
                      display: 'block',
                      height: '100%',
                      width: '100%',
                      backgroundColor: strength.color,
                      borderRadius: '9999px',
                      transformOrigin: 'left',
                    }}
                    animate={{ scaleX: strength.percent / 100 }}
                    transition={{ duration: duration.slow, ease }}
                  />
                </div>
                {strength.label && (
                  <span
                    className={`auth-strength-text is-${strength.key}`}
                    style={{
                      color: strength.textColor,
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      lineHeight: 1.15,
                      transition: 'color 260ms ease',
                    }}
                  >
                    {strength.label}
                  </span>
                )}
              </div>
              {passwordsMismatch && (
                <span id='confirm-password-error' className='auth-field-error'>
                  Passwords do not match.
                </span>
              )}
            </div>
          )}

          {error && (
            <p className='auth-message auth-error' role='alert'>
              {error}
            </p>
          )}
          {message && (
            <p className='auth-message auth-success' role='status'>
              {message}
            </p>
          )}
          <Button
            type='submit'
            className='button-primary auth-submit'
            disabled={busy || (needsConfirmPassword && passwordsMismatch)}
          >
            {busy
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign in'
                : mode === 'register'
                  ? 'Create account'
                  : TITLES[mode]}
          </Button>
        </form>

        {(mode === 'login' || mode === 'register') && (
          <>
            <div className='auth-divider'>
              <span>or continue with</span>
            </div>
            <Button
              type='button'
              variant='outline'
              className='auth-google-button'
              onClick={google}
              disabled={busy}
            >
              <span className='google-mark' aria-hidden='true'>
                G
              </span>
              Continue with Google
            </Button>
          </>
        )}

        <div className='auth-switch'>
          {mode === 'login' && (
            <p>
              New to Frugl?{' '}
              {switchModeLink(
                'register',
                '/register?next=' + encodeURIComponent(next),
                'Create an account'
              )}
            </p>
          )}
          {mode === 'register' && (
            <p>
              Already have an account?{' '}
              {switchModeLink('login', '/login?next=' + encodeURIComponent(next), 'Sign in')}
            </p>
          )}
          {mode === 'forgot' && (
            <p>
              {switchModeLink(
                'login',
                '/login?next=' + encodeURIComponent(next),
                'Back to sign in'
              )}
            </p>
          )}
        </div>
        {(mode === 'login' || mode === 'register') && (
          <p className='auth-privacy-note'>
            By continuing, you agree to use Frugl respectfully and keep your account details safe.
          </p>
        )}
      </section>
    </div>
  );
}
