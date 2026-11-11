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
      <div className='nav-inner flex items-center gap-3 px-1'>
        <Link href='/' className='brand-mark shrink-0'>Frugl</Link>
        <div className='header-search hidden flex-1 md:block'><SearchBox /></div>
        <nav className='ml-auto flex items-center gap-3 text-sm'>
          <Link href='/laptops' className='hidden md:inline'>Browse</Link>
          <Link href='/sell' className={`${btn} nav-cta`}>Sell a laptop</Link>
          {user ? (
            <>
              <Link href='/messages' aria-label='Messages'><MessageCircle size={20} /></Link>
              <NotificationBell userId={user.id} initial={unread} />
              <details className='relative'>
                <summary className='flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-emerald-100 font-medium'>
                  {(profile?.name ?? '?').charAt(0).toUpperCase()}
                </summary>
                <div className='header-menu absolute right-0 mt-2 w-48 space-y-1 rounded-lg border p-2 shadow-xl'>
                  <Link className='block rounded px-2 py-1 hover:bg-gray-100' href='/dashboard'>My listings</Link>
                  <Link className='block rounded px-2 py-1 hover:bg-gray-100' href='/saved'>Saved</Link>
                  <Link className='block rounded px-2 py-1 hover:bg-gray-100' href='/offers'>Offers</Link>
                  <Link className='block rounded px-2 py-1 hover:bg-gray-100' href='/account'>Account</Link>
                  {isStaff(profile) && <Link className='block rounded px-2 py-1 hover:bg-gray-100' href='/admin'>Admin</Link>}
                  <form action='/auth/signout' method='post'>
                    <button className='block w-full rounded px-2 py-1 text-left hover:bg-gray-100'>Sign out</button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link href='/login' className={`${btnOutline} border-white/25`}>Sign in</Link>
              <Link href='/register' className='hidden md:inline'>Sign up</Link>
            </>
          )}
        </nav>
      </div>
      <div className='header-search px-4 pb-3 md:hidden'><SearchBox /></div>
    </header>
  );
}
