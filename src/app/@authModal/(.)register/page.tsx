import AuthModalRoute from '@/components/AuthModalRoute';

export default function RegisterModalPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthModalRoute mode='register' searchParams={searchParams} />;
}