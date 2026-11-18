import AuthModalRoute from '@/components/AuthModalRoute';

export default function LoginModalPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthModalRoute mode='login' searchParams={searchParams} />;
}