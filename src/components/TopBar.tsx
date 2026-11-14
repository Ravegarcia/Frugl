import Link from 'next/link';
import { connection } from 'next/server';
import { ChevronDown, Gear, Laptop, Shield, SignOut, Tag, User } from '@/components/icons';
import { getSessionProfile, isStaff } from '@/lib/auth';
import HeaderSearchReveal from '@/components/HeaderSearchReveal';
import HeaderNavIcons from '@/components/HeaderNavIcons';

export default async function TopBar() {
  await connection();
  const { supabase, user, profile } = await getSessionProfile();
  const canBrowse = Boolean(user && profile?.role !== 'admin');
  let unread = 0;
  if (user && profile?.role !== 'admin') {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);
    unread = count ?? 0;
  }

  return (
    <>
      <header className='site-header'>
        <div className='nav-inner'>
          <Link href='/' className='brand-mark shrink-0'>Frugl</Link>
          {canBrowse && <HeaderSearchReveal />}
          <nav className='header-actions' aria-label='Main navigation'>
            {canBrowse && (
              <Link href='/laptops' className='nav-browse-link'>Browse</Link>
            )}
            {profile?.role !== 'admin' && <Link href='/sell' className='nav-cta'>Sell a laptop</Link>}
            {user ? (
              <>
                {profile?.role === 'admin' ? (
                  <Link href='/admin' className='nav-browse-link'>Admin dashboard</Link>
                ) : (
                  <HeaderNavIcons userId={user.id} initialUnread={unread} />
                )}
                <details className='profile-dropdown'>
                  <summary aria-label='Open profile menu' className='profile-pill'>
                    <span className='profile-avatar'>
                      {(profile?.name ?? '?').charAt(0).toUpperCase()}
                    </span>
                    <span className='profile-label'>{profile?.name?.trim().split(/\s+/)[0] || 'Profile'}</span>
                    <ChevronDown size={14} />
                  </summary>
                  <div className='header-menu'>
                    <div className='profile-menu-heading'>
                      <strong>{profile?.name ?? 'Your account'}</strong>
                      {user.email && <span>{user.email}</span>}
                    </div>
                    <div className='profile-menu-links'>
                      {profile?.role === 'admin' ? (
                        <Link href='/admin'><Shield size={17} />Admin dashboard</Link>
                      ) : (
                        <>
                          <Link href={`/sellers/${user.id}`}><User size={17} variant='solid' />My Profile</Link>
                          <Link href='/dashboard'><Laptop size={17} />Manage Listings</Link>
                          <Link href='/account'><Gear size={17} />Settings</Link>
                          <Link href='/offers'><Tag size={17} />Offers</Link>
                          {isStaff(profile) && <Link href='/admin'><Shield size={17} />Admin</Link>}
                        </>
                      )}
                    </div>
                    <form action='/auth/signout' method='post' className='profile-signout'>
                      <button type='submit'><SignOut size={17} />Sign out</button>
                    </form>
                  </div>
                </details>
              </>
            ) : (
              <>
                <Link href='/login' className='nav-auth-link'>Sign in</Link>
                <Link href='/register' className='nav-auth-link nav-signup'>Sign up</Link>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
