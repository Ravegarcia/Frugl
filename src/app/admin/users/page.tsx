import { requireStaff } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import Link from 'next/link';
import AdminUserRow from './AdminUserRow';

export default async function AdminUsersPage() {
  const { supabase, profile: myProfile } = await requireStaff();

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Manage Users</h1>
          <p className='text-sm text-gray-500'>Verify sellers, suspend accounts, and manage roles.</p>
        </div>
        <Link href='/admin' className='text-xs text-gray-500 underline'>
          Back to Admin Hub
        </Link>
      </div>

      <div className='divide-y rounded-xl border bg-white shadow-sm overflow-hidden'>
        {(users || []).map((u: any) => (
          <AdminUserRow key={u.id} user={u} currentRole={myProfile.role} />
        ))}
      </div>
    </div>
  );
}
