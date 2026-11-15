import { Users } from '@/components/icons';
import AdminActivityViewed from '../AdminActivityViewed';
import { requireStaff } from '@/lib/auth';
import AdminUserRow from './AdminUserRow';

export default async function AdminUsersPage() {
  const { supabase, profile: myProfile } = await requireStaff();

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <main className='admin-users-page'>
      <AdminActivityViewed eventType='account_created' />
      <header className='admin-users-header'>
        <div>
          <p className='admin-eyebrow'>Marketplace access</p>
          <h1>Manage users</h1>
          <p>Review accounts, verify sellers, and manage staff access.</p>
          <div className='admin-users-note'>
            <span aria-hidden='true'>i</span>
            <p>All marketplace members can buy and sell. Seller verification is managed separately.</p>
          </div>
        </div>
      </header>

      <section className='admin-users-section' aria-labelledby='admin-users-list-title'>
        <div className='admin-users-section-heading'>
          <div>
            <p className='admin-eyebrow'>Account directory</p>
            <h2 id='admin-users-list-title'>User accounts</h2>
          </div>
          <span className='admin-users-count'>{users?.length ?? 0} shown</span>
        </div>

        {users?.length ? (
          <div className='admin-users-list'>
            {users.map((user) => (
              <AdminUserRow key={user.id} user={user} currentRole={myProfile.role} />
            ))}
          </div>
        ) : (
          <div className='admin-users-empty'>
            <span aria-hidden='true'><Users size={20} /></span>
            <strong>No user accounts yet</strong>
            <p>New marketplace accounts will appear here.</p>
          </div>
        )}
      </section>
    </main>
  );
}
