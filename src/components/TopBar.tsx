import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { getSessionProfile, isStaff } from '@/lib/auth';
import { btn, btnOutline } from '@/lib/ui';
import SearchBox from '@/components/SearchBox';
import NotificationBell from '@/components/NotificationBell';

export default async function TopBar() {
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
    <header className='sticky top-0 z-20 border-b bg-white'>
      <div className='mx-auto flex max-w-6xl items-center gap-3 px-4 py-3'>
        <Link href='/' className='text-xl font-bold text-emerald-700'>Frugl</Link>
        <div className='hidden flex-1 md:block'><SearchBox /></div>
        <nav className='ml-auto flex items-center gap-3 text-sm'>
          <Link href='/laptops' className='hidden md:inline'>Browse</Link>
          <Link href='/sell' className={btn}>Sell a laptop</Link>
          {user ? (
            <>
              <Link href='/messages' aria-label='Messages'><MessageCircle size={20} /></Link>
              <NotificationBell userId={user.id} initial={unread} />
              <details className='relative'>
                <summary className='flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full bg-emerald-100 font-medium'>
                  {(profile?.name ?? '?').charAt(0).toUpperCase()}
                </summary>
                <div className='absolute right-0 mt-2 w-48 space-y-1 rounded-lg border bg-white p-2 shadow'>
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
              <Link href='/login' className={btnOutline}>Sign in</Link>
              <Link href='/register' className='hidden md:inline'>Sign up</Link>
            </>
          )}
        </nav>
      </div>
      <div className='px-4 pb-3 md:hidden'><SearchBox /></div>
    </header>
  );
}
