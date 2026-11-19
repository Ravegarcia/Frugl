import Link from 'next/link';
import { Home, Search, PlusCircle, MessageCircle, User } from '@/components/icons';
import { getSessionProfile } from '@/lib/auth';
import AuthModalLink from '@/components/AuthModalLink';

const memberItems = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/laptops', label: 'Browse', Icon: Search },
  { href: '/sell', label: 'Sell', Icon: PlusCircle },
  { href: '/messages', label: 'Messages', Icon: MessageCircle },
  { href: '/account', label: 'Account', Icon: User },
];

const guestItems = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/sell', label: 'Sell', Icon: PlusCircle },
  { href: '/login', label: 'Sign in', Icon: User },
  { href: '/register', label: 'Sign up', Icon: User },
];

export default async function BottomBar() {
  const { user, profile } = await getSessionProfile();
  if (profile?.role === 'admin') return null;

  const items = user ? memberItems : guestItems;

  return (
    <nav className='fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-lavender-300 bg-[rgb(255_253_250_/_0.97)] py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-foreground shadow-[0_-4px_16px_rgb(24_13_38_/_0.05)] md:hidden' aria-label='Mobile navigation'>
      {items.map(({ href, label, Icon }) => {
        const content = (
          <>
            <Icon size={20} variant='solid' className='transition-[translate] duration-160 group-hover:-translate-y-px motion-reduce:translate-y-0!' />
            {label}
          </>
        );

        if (href === '/login' || href === '/register') {
          return (
            <AuthModalLink
              key={href}
              mode={href === '/login' ? 'login' : 'register'}
              className='group flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-[0.15rem] rounded-[0.8rem] px-1 text-xs text-muted-foreground transition-[color,background-color,transform] duration-160 hover:bg-lavender-100 hover:text-plum-900 focus-visible:bg-lavender-100 focus-visible:text-plum-900'
            >
              {content}
            </AuthModalLink>
          );
        }

        return (
          <Link key={href} href={href} className='group flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-[0.15rem] rounded-[0.8rem] px-1 text-xs text-muted-foreground transition-[color,background-color,transform] duration-160 hover:bg-lavender-100 hover:text-plum-900 focus-visible:bg-lavender-100 focus-visible:text-plum-900'>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
