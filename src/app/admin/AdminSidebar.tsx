'use client';

import { AlertTriangle, FileLines, Flag, Laptop, Shield, Users } from '@/components/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminActivityCountBadge from './AdminActivityCountBadge';
import type { AdminActivityEvent } from '@/lib/admin/activity';

const navigation = [
  { label: 'Overview', href: '/admin', Icon: Shield, group: 'Workspace' },
  { label: 'Backups', href: '/admin/backups', Icon: FileLines, group: 'Data protection' },
  {
    label: 'Reports',
    href: '/admin/reports',
    Icon: Flag,
    group: 'Trust & safety',
    activityType: 'report_created',
  },
  {
    label: 'Scam alerts',
    href: '/admin/alerts',
    Icon: AlertTriangle,
    group: 'Trust & safety',
    activityType: 'chat_alert_created',
  },
  {
    label: 'Listings',
    href: '/admin/listings?status=all',
    Icon: Laptop,
    group: 'Marketplace',
    activityType: 'listing_created',
  },
  {
    label: 'Members',
    href: '/admin/users',
    Icon: Users,
    group: 'Marketplace',
    activityType: 'account_created',
  },
] satisfies Array<{
  label: string;
  href: string;
  Icon: typeof Shield;
  group: string;
  activityType?: AdminActivityEvent;
}>;

const navigationGroups = ['Workspace', 'Marketplace', 'Trust & safety', 'Data protection'];

export default function AdminSidebar({
  staffId,
  initialActivityCounts,
}: {
  staffId: string;
  initialActivityCounts: Record<AdminActivityEvent, number>;
}) {
  const pathname = usePathname();

  return (
    <aside className='admin-sidebar' aria-label='Admin dashboard navigation'>
      <Link href='/admin' className='admin-sidebar-brand'>
        <span className='admin-brand-mark'>F</span>
        <span>
          <strong>Frugl</strong>
          <small>Admin workspace</small>
        </span>
      </Link>

      <nav className='admin-sidebar-nav'>
        {navigationGroups.map((group) => {
          const links = navigation.filter((item) => item.group === group);
          return (
            <div className='admin-nav-group' key={group}>
              <p>{group}</p>
              {links.map(({ label, href, Icon, activityType }) => {
                const path = href.split('?')[0];
                const active = path === '/admin'
                  ? pathname === path
                  : pathname === path || pathname.startsWith(`${path}/`);

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`admin-nav-link${active ? ' is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={17} />
                    <span>{label}</span>
                    {activityType && (
                      <AdminActivityCountBadge
                        staffId={staffId}
                        eventType={activityType}
                        initialCount={initialActivityCounts[activityType]}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

    </aside>
  );
}
