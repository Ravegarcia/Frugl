import { Suspense } from 'react';
import { Users } from '@/components/icons';
import { redirect } from 'next/navigation';
import {
  ADMIN_PAGE_SIZE,
  getAdminPageRange,
  parseAdminPage,
} from '@/lib/admin/pagination';
import AdminActivityViewed from '../AdminActivityViewed';
import AdminPagination from '../AdminPagination';
import { requireStaff } from '@/lib/auth';
import AdminUserRow from './AdminUserRow';
import AdminLoading from '../loading';

type AdminUsersPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default function AdminUsersPage(props: AdminUsersPageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminUsersContent {...props} />
    </Suspense>
  );
}

async function AdminUsersContent({
  searchParams,
}: AdminUsersPageProps) {
  const { supabase, profile: myProfile, user: currentUser } = await requireStaff();
  const { page: pageParam } = await searchParams;
  const page = parseAdminPage(pageParam);
  const { from, to } = getAdminPageRange(page);

  const { data: users, error, count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .neq('role', 'admin')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Unable to load admin users: ${error.message}`);
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / ADMIN_PAGE_SIZE));
  if (page > totalPages) {
    redirect(`/admin/users?page=${totalPages}`);
  }

  return (
    <div className='admin-users-page'>
      <AdminActivityViewed eventType='account_created' />
      <header className='admin-users-header'>
        <div>
          <p className='admin-eyebrow'>Marketplace access</p>
          <h1>Manage members</h1>
          <p>Review marketplace member accounts and verify sellers.</p>
        </div>
      </header>

      <section className='admin-users-section' aria-labelledby='admin-users-list-title'>
        <div className='admin-users-section-heading'>
          <div>
            <p className='admin-eyebrow'>Account directory</p>
            <h2 id='admin-users-list-title'>Member accounts</h2>
          </div>
          <span className='admin-users-count'>{(count ?? 0).toLocaleString()} members</span>
        </div>

        {users?.length ? (
          <div className='admin-users-list'>
            {users.map((user) => (
              <AdminUserRow
                key={user.id}
                user={user}
                currentRole={myProfile.role}
                currentUserId={currentUser.id}
              />
            ))}
          </div>
        ) : (
          <div className='admin-users-empty'>
            <span aria-hidden='true'><Users size={20} /></span>
            <strong>No marketplace members yet</strong>
            <p>New marketplace accounts will appear here.</p>
          </div>
        )}
        <AdminPagination path='/admin/users' page={page} totalPages={totalPages} />
      </section>
    </div>
  );
}
