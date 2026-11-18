import AuthModalRoute from '@/components/AuthModalRoute';

export default function ForgotPasswordModalPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthModalRoute mode='forgot' searchParams={searchParams} />;
}