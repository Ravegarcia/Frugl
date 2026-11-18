import AuthModalDialog from '@/components/AuthModalDialog';
import { safeRedirectPath } from '@/lib/auth/redirect';

type AuthModalMode = 'login' | 'register' | 'forgot';
type SearchParams = Promise<{ next?: string }>;

export default async function AuthModalRoute({
  mode,
  searchParams,
}: {
  mode: AuthModalMode;
  searchParams: SearchParams;
}) {
  const { next } = await searchParams;
  return <AuthModalDialog mode={mode} next={safeRedirectPath(next)} />;
}
