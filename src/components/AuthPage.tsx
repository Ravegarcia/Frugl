import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';

type AuthMode = 'login' | 'register';
type SearchParams = Promise<{ next?: string }>;

export default function AuthPage({ mode, searchParams }: { mode: AuthMode; searchParams: SearchParams }) {
  return (
    <Suspense
      fallback={
        <div className='auth-layout' aria-busy='true' aria-label='Loading sign-in form'>
          <aside className='auth-aside'>
            <span className='auth-brand'>Frugl</span>
            <p>Loading your account form…</p>
          </aside>
          <section className='auth-card'>
            <p className='auth-eyebrow'>Your next laptop starts here</p>
            <p className='mt-4 text-sm text-gray-500'>Loading…</p>
          </section>
        </div>
      }
    >
      <AuthPageContent mode={mode} searchParams={searchParams} />
    </Suspense>
  );
}

async function AuthPageContent({ mode, searchParams }: { mode: AuthMode; searchParams: SearchParams }) {
  const { next } = await searchParams;
  const safe = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  return <AuthForm mode={mode} next={safe} />;
}
