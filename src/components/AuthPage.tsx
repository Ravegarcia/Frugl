import { Suspense } from 'react';
import AuthModalDialog from '@/components/AuthModalDialog';
import { safeRedirectPath } from '@/lib/auth/redirect';

type AuthMode = 'login' | 'register' | 'forgot';
type SearchParams = Promise<{ next?: string }>;

export default function AuthPage({ mode, searchParams }: { mode: AuthMode; searchParams: SearchParams }) {
  return (
    <Suspense fallback={null}>
      <AuthPageContent mode={mode} searchParams={searchParams} />
    </Suspense>
  );
}

async function AuthPageContent({ mode, searchParams }: { mode: AuthMode; searchParams: SearchParams }) {
  const { next } = await searchParams;
  return <AuthModalDialog mode={mode} next={safeRedirectPath(next)} isStandalonePage />;
}
