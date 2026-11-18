import AuthPage from '@/components/AuthPage';

export default function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthPage mode='forgot' searchParams={searchParams} />;
}
