import AuthPage from '@/components/AuthPage';

export default function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthPage mode='register' searchParams={searchParams} />;
}
