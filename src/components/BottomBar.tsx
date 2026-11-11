import Link from 'next/link';
import { Home, Search, PlusCircle, MessageCircle, User } from '@/components/icons';

const items = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/laptops', label: 'Browse', Icon: Search },
  { href: '/sell', label: 'Sell', Icon: PlusCircle },
  { href: '/messages', label: 'Messages', Icon: MessageCircle },
  { href: '/account', label: 'Account', Icon: User },
];

export default function BottomBar() {
  return (
    <nav className='mobile-nav fixed inset-x-0 bottom-0 z-20 flex justify-around py-2 md:hidden'>
      {items.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className='flex flex-col items-center text-xs'>
          <Icon size={20} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
