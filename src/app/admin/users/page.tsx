import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import {
  ADMIN_PAGE_SIZE,
  getAdminPageRange,
  parseAdminPage,
} from '@/lib/admin/pagination';
import AdminActivityViewed from '../AdminActivityViewed';
import AdminPagination from '../AdminPagination';
import { requireStaff } from '@/lib/auth';
import EmptyState from '@/components/EmptyState';
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
    <div className='admin-queue-page admin-users-page'>
      <AdminActivityViewed eventType='account_created' />
      <header className='admin-queue-heading'>
        <div>
          <p className='admin-eyebrow'>Marketplace access</p>
          <h1 id='admin-users-title'>Manage members</h1>
          <p>Review marketplace member accounts and verify sellers.</p>
        </div>
      </header>

      <section className='admin-panel admin-queue-panel admin-users-panel' aria-labelledby='admin-users-list-title'>
        <div className='admin-users-panel-heading'>
          <div>
            <p className='admin-eyebrow'>Account directory</p>
            <h2 id='admin-users-list-title'>Member accounts</h2>
          </div>
          <span className='admin-users-count'>{(count ?? 0).toLocaleString()} members</span>
        </div>
        {users?.length ? (
          <div
            className='admin-queue-list admin-users-list'
            role='list'
            aria-label='User accounts'
            tabIndex={0}
          >
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
          <EmptyState title='No marketplace members yet' hint='New marketplace accounts will appear here.' />
        )}
        <AdminPagination
          path='/admin/users'
          page={page}
          totalPages={totalPages}
          totalCount={count ?? 0}
          showSinglePage
        />
      </section>
    </div>
  );
}
