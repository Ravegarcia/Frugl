import Link from 'next/link';
import { Home, Search, PlusCircle, MessageCircle, Shield, User } from '@/components/icons';
import { getSessionProfile } from '@/lib/auth';

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
  const items = profile?.role === 'admin'
    ? [{ href: '/admin', label: 'Admin', Icon: Shield }]
    : user ? memberItems : guestItems;

  return (
    <nav className='mobile-nav fixed inset-x-0 bottom-0 z-20 flex justify-around py-2 md:hidden' aria-label='Mobile navigation'>
      {items.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className='flex flex-col items-center text-xs'>
          <Icon size={20} variant='solid' />
          {label}
        </Link>
      ))}
    </nav>
  );
}
