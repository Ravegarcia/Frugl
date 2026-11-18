import Link from 'next/link';
import { connection } from 'next/server';
import { ChevronDown, Gear, Laptop, Shield, SignOut, Tag, User } from '@/components/icons';
import { getSessionProfile, isStaff } from '@/lib/auth';
import HeaderSearch from '@/components/HeaderSearch';
import HeaderNavIcons from '@/components/HeaderNavIcons';
import AuthModalLink from '@/components/AuthModalLink';
import type { NotificationItem } from '@/components/NotificationBell';

const navLinkClasses =
  'inline-flex min-h-12 items-center rounded-full px-[0.65rem] text-plum-900 transition-[background-color,box-shadow,color] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-lavender-100 hover:text-plum-900 hover:shadow-[0_5px_14px_rgb(24_13_38_/_0.18)] focus-visible:bg-lavender-100 focus-visible:text-plum-900 focus-visible:shadow-[0_5px_14px_rgb(24_13_38_/_0.18)]';
const profileMenuLinkClasses =
  'group flex min-h-[2.75rem] w-full items-center gap-3 px-[1.1rem] py-[0.65rem] text-left text-[0.9rem] text-foreground transition-[background-color,color] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-lavender-100';
const profileMenuContentClasses =
  'inline-flex items-center gap-3 transition-[translate] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:translate-x-0!';
const profileMenuIconClasses =
  'shrink-0 text-plum-700 transition-colors duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-primary-container';

export default async function TopBar() {
  await connection();
  const { supabase, user, profile } = await getSessionProfile();
  const canBrowse = Boolean(user && profile?.role !== 'admin');
  let unread = 0;
  let unreadMessages = 0;
  let recentNotifications: NotificationItem[] = [];
  let notificationsLoadError = false;
  let unreadPublishedListings = 0;
  let savedIds: string[] = [];
  if (user && profile?.role !== 'admin') {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('type', 'listing_published')
      .is('read_at', null);
    unread = count ?? 0;

    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('id, type, payload, created_at, read_at')
      .eq('user_id', user.id)
      .neq('type', 'listing_published')
      .order('created_at', { ascending: false })
      .limit(8);
    if (notificationsError) {
      console.error('Could not load recent notifications:', notificationsError.message);
      notificationsLoadError = true;
    } else {
      recentNotifications = notifications ?? [];
    }

    const { count: unreadMessageCount, error: unreadMessageError } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .neq('sender_id', user.id)
      .is('read_at', null);
    if (unreadMessageError) {
      console.error('Could not load unread message count:', unreadMessageError.message);
    }
    unreadMessages = unreadMessageCount ?? 0;

    const { count: publishedCount, error: publishedCountError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'listing_published')
      .is('read_at', null);
    if (publishedCountError) {
      console.error('Could not load published listing notification count:', publishedCountError.message);
    }
    unreadPublishedListings = publishedCount ?? 0;

    const { data: savedListings, error: savedListingsError } = await supabase
      .from('saved_listings')
      .select('listing_id')
      .eq('user_id', user.id);
    if (savedListingsError) console.error('Could not load saved listings:', savedListingsError.message);
    savedIds = (savedListings ?? []).map(({ listing_id }) => listing_id);
  }

  return (
    <>
      <header className='sticky top-0 z-20 bg-transparent px-4 pt-3 text-foreground [--header-gap:0.75rem] max-md:px-2.5 max-md:pt-2 max-md:[--header-gap:0.55rem]'>
        <div className='mx-auto flex min-h-[4.5rem] w-full max-w-[80rem] items-center gap-[var(--header-gap)] rounded-[1.25rem] border border-lavender-300 bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-5 shadow-[0_10px_28px_rgb(24_13_38_/_0.07)] backdrop-blur-[14px] transition-shadow duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] max-md:min-h-0 max-md:flex-wrap max-md:rounded-2xl max-md:px-3 max-md:py-[0.55rem]'>
          <Link href='/' className='shrink-0 font-heading text-[1.35rem] tracking-[-0.04em] text-primary! max-md:text-[1.05rem]'>Frugl</Link>
          {canBrowse && <HeaderSearch />}
          <nav className='ml-auto flex items-center gap-[0.35rem] text-sm max-md:w-auto max-md:justify-end max-md:text-[0.8rem]' aria-label='Main navigation'>
            {canBrowse && (
              <Link href='/laptops' className={`${navLinkClasses} max-md:hidden md:max-[1000px]:hidden`}>Browse</Link>
            )}
            {profile?.role !== 'admin' && <Link href='/sell' className='button-primary inline-flex min-h-12 items-center justify-center whitespace-nowrap px-[0.85rem] py-[0.7rem] font-semibold max-md:px-3'>Sell a laptop</Link>}
            {user ? (
              <>
                {profile?.role === 'admin' ? (
                  <Link href='/admin' className={`${navLinkClasses} max-md:hidden`}>Admin dashboard</Link>
                ) : (
                  <HeaderNavIcons
                    key={user.id}
                    userId={user.id}
                    initialUnread={unread}
                    initialNotifications={recentNotifications}
                    initialLoadError={notificationsLoadError}
                    initialUnreadMessages={unreadMessages}
                    initialSavedIds={savedIds}
                  />
                )}
                <details className='group/profile relative'>
                  <summary
                    aria-label={unreadPublishedListings
                      ? `Open profile menu, ${unreadPublishedListings} new Manage Listings notification${unreadPublishedListings === 1 ? '' : 's'}`
                      : 'Open profile menu'}
                    className='group/summary flex min-h-[3.2rem] max-w-[15rem] cursor-pointer list-none items-center gap-2 rounded-full border border-lavender-300 bg-surface py-1 pl-[0.35rem] pr-[0.8rem] text-plum-900 transition-[border-color,box-shadow] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-plum-700 hover:shadow-[0_0_0_3px_rgb(67_54_79_/_0.12)] focus-visible:border-plum-700 focus-visible:shadow-[0_0_0_3px_rgb(67_54_79_/_0.12)] group-open/profile:border-plum-700 group-open/profile:shadow-[0_0_0_3px_rgb(67_54_79_/_0.12)] [&::-webkit-details-marker]:hidden'
                  >
                    <span className='relative inline-flex shrink-0'>
                      <span className='inline-flex size-[2.3rem] shrink-0 items-center justify-center rounded-full bg-primary-fixed font-semibold text-primary-container'>
                        {(profile?.name ?? '?').charAt(0).toUpperCase()}
                      </span>
                      {unreadPublishedListings > 0 && (
                        <span className='absolute -right-[0.55rem] -top-[0.45rem] z-[1] inline-flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-destructive px-[0.2rem] text-center text-[0.68rem] font-semibold leading-none text-destructive-foreground' aria-hidden='true'>
                          {unreadPublishedListings > 99 ? '99+' : unreadPublishedListings}
                        </span>
                      )}
                    </span>
                    <span className='max-w-[8.5rem] truncate max-md:hidden md:max-[1000px]:hidden'>{profile?.name?.trim().split(/\s+/)[0] || 'Profile'}</span>
                    <ChevronDown
                      size={14}
                      className='transition-[color,scale,rotate] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/summary:scale-[1.06] group-hover/summary:text-primary-container group-focus-visible/summary:scale-[1.06] group-focus-visible/summary:text-primary-container group-open/profile:rotate-180 motion-reduce:scale-100! motion-reduce:rotate-0!'
                    />
                  </summary>
                  <div className='absolute right-0 top-[calc(100%+0.55rem)] z-30 w-72 overflow-hidden rounded-2xl border border-lavender-300 bg-surface text-foreground shadow-[0_16px_38px_rgb(24_13_38_/_0.12)]'>
                    <div className='grid gap-1 border-b border-lavender-300 px-[1.1rem] pb-[0.9rem] pt-4'>
                      <strong className='text-[0.98rem] font-semibold text-plum-900'>{profile?.name ?? 'Your account'}</strong>
                      {user.email && <span className='truncate text-[0.8rem] text-plum-700'>{user.email}</span>}
                    </div>
                    <div className='grid py-[0.35rem]'>
                      {profile?.role === 'admin' ? (
                        <Link href='/admin' className={profileMenuLinkClasses}><span className={profileMenuContentClasses}><Shield size={17} className={profileMenuIconClasses} />Admin dashboard</span></Link>
                      ) : (
                        <>
                          <Link href={`/sellers/${user.id}`} className={profileMenuLinkClasses}><span className={profileMenuContentClasses}><User size={17} variant='solid' className={profileMenuIconClasses} />My Profile</span></Link>
                          <Link
                            href='/dashboard'
                            className={profileMenuLinkClasses}
                            aria-label={unreadPublishedListings
                              ? `Manage Listings, ${unreadPublishedListings} new published listing notification${unreadPublishedListings === 1 ? '' : 's'}`
                              : 'Manage Listings'}
                          >
                            <span className={profileMenuContentClasses}>
                              <span className='relative inline-flex shrink-0'>
                                <Laptop size={17} className={profileMenuIconClasses} />
                                {unreadPublishedListings > 0 && (
                                  <span className='absolute -right-[0.55rem] -top-[0.45rem] z-[1] inline-flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-destructive px-[0.2rem] text-center text-[0.68rem] font-semibold leading-none text-destructive-foreground' aria-hidden='true'>
                                    {unreadPublishedListings > 99 ? '99+' : unreadPublishedListings}
                                  </span>
                                )}
                              </span>
                              Manage Listings
                            </span>
                          </Link>
                          <Link href='/account' className={profileMenuLinkClasses}><span className={profileMenuContentClasses}><Gear size={17} className={profileMenuIconClasses} />Settings</span></Link>
                          <Link href='/offers' className={profileMenuLinkClasses}><span className={profileMenuContentClasses}><Tag size={17} className={profileMenuIconClasses} />Offers</span></Link>
                          {isStaff(profile) && <Link href='/admin' className={profileMenuLinkClasses}><span className={profileMenuContentClasses}><Shield size={17} className={profileMenuIconClasses} />Admin</span></Link>}
                        </>
                      )}
                    </div>
                    <form action='/auth/signout' method='post' className='border-t border-lavender-300 py-[0.35rem]'>
                      <button type='submit' className={`${profileMenuLinkClasses} text-destructive hover:text-destructive`}>
                        <span className={profileMenuContentClasses}><SignOut size={17} className='shrink-0 text-destructive' />Sign out</span>
                      </button>
                    </form>
                  </div>
                </details>
              </>
            ) : (
              <>
                <AuthModalLink mode='login' className={navLinkClasses}>Sign in</AuthModalLink>
                <AuthModalLink mode='register' className={`${navLinkClasses} font-semibold`}>Sign up</AuthModalLink>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
