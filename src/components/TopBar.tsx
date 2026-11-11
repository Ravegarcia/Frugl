import Link from 'next/link';
import { connection } from 'next/server';
import { MessageCircle } from '@/components/icons';
import { getSessionProfile, isStaff } from '@/lib/auth';
import { btn, btnOutline } from '@/lib/ui';
import SearchBox from '@/components/SearchBox';
import NotificationBell from '@/components/NotificationBell';

export default async function TopBar() {
  await connection();
  const { supabase, user, profile } = await getSessionProfile();
  let unread = 0;
  if (user) {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);
    unread = count ?? 0;
  }

  return (
    <header className='site-header'>
      <div className='nav-inner'>
        <Link href='/' className='brand-mark' aria-label='Frugl home'>
          <span className='brand-mark-badge'>F</span>
          Frugl
        </Link>

        <div className='header-search hidden flex-1 md:flex'>
          <SearchBox />
        </div>

        <nav aria-label='Main navigation' className='main-nav'>
          <Link href='/laptops' className='nav-link hidden md:inline-flex'>Browse</Link>
          <Link href='/sell' className={`${btn} nav-cta`}>Sell a laptop</Link>

          {user ? (
            <>
              <Link href='/messages' aria-label='Messages' className='icon-button'>
                <MessageCircle size={18} />
              </Link>
              <NotificationBell userId={user.id} initial={unread} />
              <details className='profile-menu'>
                <summary className='profile-trigger'>
                  {(profile?.name ?? '?').charAt(0).toUpperCase()}
                </summary>
                <div className='header-menu'>
                  <Link href='/dashboard'>My listings</Link>
                  <Link href='/saved'>Saved</Link>
                  <Link href='/offers'>Offers</Link>
                  <Link href='/account'>Account</Link>
                  {isStaff(profile) && <Link href='/admin'>Admin</Link>}
                  <form action='/auth/signout' method='post'>
                    <button type='submit'>Sign out</button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link href='/login' className={`${btnOutline} border-white/25`}>Sign in</Link>
              <Link href='/register' className='nav-link hidden md:inline-flex'>Sign up</Link>
            </>
          )}
        </nav>
      </div>

      <div className='header-search px-4 pb-3 md:hidden'>
        <SearchBox />
      </div>
    </header>
  );
}
