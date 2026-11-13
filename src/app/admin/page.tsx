import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { AlertTriangle, ExternalLink, Flag, Laptop, Shield, Users } from '@/components/icons';

const navigation = [
  {
    label: 'Overview',
    href: '/admin',
    Icon: Shield,
    group: 'Workspace',
  },
  {
    label: 'Report queue',
    href: '/admin/reports',
    Icon: Flag,
    group: 'Trust & safety',
  },
  {
    label: 'Chat alerts',
    href: '/admin/alerts',
    Icon: AlertTriangle,
    group: 'Trust & safety',
  },
  {
    label: 'Listings',
    href: '/admin/listings',
    Icon: Laptop,
    group: 'Marketplace',
  },
  {
    label: 'Members',
    href: '/admin/users',
    Icon: Users,
    group: 'Marketplace',
  },
];

export default async function AdminDashboardPage() {
  const { supabase, profile } = await requireStaff();

  const [
    openReportsCount,
    chatAlertsCount,
    activeListingsCount,
    membersCount,
    reportsResult,
    alertsResult,
  ] = await Promise.all([
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('chat_alerts').select('id', { count: 'exact', head: true }),
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .in('status', ['available', 'reserved'])
      .eq('is_visible', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('reports')
      .select('id, target_type, target_id, reason, created_at, reporter:profiles!reports_reporter_id_fkey(name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('chat_alerts')
      .select('id, matched_phrases, created_at, messages(body, sender:profiles!messages_sender_id_fkey(name))')
      .order('created_at', { ascending: false })
      .limit(4),
  ]);

  const results = [
    openReportsCount,
    chatAlertsCount,
    activeListingsCount,
    membersCount,
    reportsResult,
    alertsResult,
  ];
  const failedQuery = results.find((result) => result.error);
  if (failedQuery?.error) {
    throw new Error(`Unable to load admin dashboard: ${failedQuery.error.message}`);
  }

  const stats = [
    {
      label: 'Open reports',
      value: openReportsCount.count ?? 0,
      detail: 'Waiting for review',
      href: '/admin/reports',
      Icon: Flag,
      tone: 'report',
    },
    {
      label: 'Chat alerts',
      value: chatAlertsCount.count ?? 0,
      detail: 'Flagged messages',
      href: '/admin/alerts',
      Icon: AlertTriangle,
      tone: 'alert',
    },
    {
      label: 'Live listings',
      value: activeListingsCount.count ?? 0,
      detail: 'Visible to buyers',
      href: '/admin/listings',
      Icon: Laptop,
      tone: 'listing',
    },
    {
      label: 'Marketplace members',
      value: membersCount.count ?? 0,
      detail: 'Registered accounts',
      href: '/admin/users',
      Icon: Users,
      tone: 'member',
    },
  ];

  const reports = reportsResult.data ?? [];
  const alerts = alertsResult.data ?? [];
  const groupedNavigation = ['Workspace', 'Trust & safety', 'Marketplace'];
  const name = profile?.name?.trim() || 'Admin';

  return (
    <div className='admin-dashboard'>
      <aside className='admin-sidebar' aria-label='Admin dashboard navigation'>
        <Link href='/admin' className='admin-sidebar-brand'>
          <span className='admin-brand-mark'>F</span>
          <span>
            <strong>Frugl</strong>
            <small>Admin workspace</small>
          </span>
        </Link>

        <nav className='admin-sidebar-nav'>
          {groupedNavigation.map((group) => {
            const links = navigation.filter((item) => item.group === group);
            return (
              <div className='admin-nav-group' key={group}>
                <p>{group}</p>
                {links.map(({ label, href, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={href === '/admin' ? 'admin-nav-link is-active' : 'admin-nav-link'}
                    aria-current={href === '/admin' ? 'page' : undefined}
                  >
                    <Icon size={17} />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>

        <div className='admin-sidebar-user'>
          <span className='admin-user-avatar'>{name.charAt(0).toUpperCase()}</span>
          <span className='admin-user-details'>
            <strong>{name}</strong>
            <small>{profile?.role === 'admin' ? 'Administrator' : 'Moderator'}</small>
          </span>
        </div>
      </aside>

      <div className='admin-dashboard-main'>
        <header className='admin-dashboard-header'>
          <div>
            <p className='admin-eyebrow'>Frugl operations</p>
            <h1>Marketplace overview</h1>
            <p>Keep listings trustworthy and help the community trade with confidence.</p>
          </div>
          <Link href='/admin/reports' className='admin-header-action'>
            Review reports <ExternalLink size={15} />
          </Link>
        </header>

        <section className='admin-stats-grid' aria-label='Marketplace summary'>
          {stats.map(({ label, value, detail, href, Icon, tone }) => (
            <Link href={href} className={`admin-stat-card tone-${tone}`} key={label}>
              <span className='admin-stat-icon'><Icon size={18} /></span>
              <span className='admin-stat-label'>{label}</span>
              <strong>{value.toLocaleString()}</strong>
              <span className='admin-stat-detail'>{detail}</span>
            </Link>
          ))}
        </section>

        <div className='admin-panels-grid'>
          <section className='admin-panel'>
            <div className='admin-panel-heading'>
              <div>
                <p className='admin-eyebrow'>Trust &amp; safety</p>
                <h2>Recent reports</h2>
              </div>
              <Link href='/admin/reports'>View queue <ExternalLink size={14} /></Link>
            </div>

            {reports.length ? (
              <div className='admin-report-list'>
                {reports.map((report) => (
                  <article className='admin-report-row' key={report.id}>
                    <span className='admin-report-icon'><Flag size={16} /></span>
                    <div className='admin-report-copy'>
                      <strong>{report.reason}</strong>
                      <span>
                        {report.target_type === 'listing' ? 'Listing' : 'Member'} reported by{' '}
                        {report.reporter?.[0]?.name || 'a member'}
                      </span>
                    </div>
                    <span className='admin-status-badge'>Open</span>
                    <Link href='/admin/reports' className='admin-row-link' aria-label='Review report'>
                      <ExternalLink size={15} />
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className='admin-empty-state'>
                <span className='admin-empty-icon'><Shield size={20} /></span>
                <strong>All caught up</strong>
                <p>There are no open reports to review.</p>
              </div>
            )}
          </section>

          <section className='admin-panel'>
            <div className='admin-panel-heading'>
              <div>
                <p className='admin-eyebrow'>Automated checks</p>
                <h2>Chat alerts</h2>
              </div>
              <Link href='/admin/alerts'>View alerts <ExternalLink size={14} /></Link>
            </div>

            {alerts.length ? (
              <div className='admin-alert-list'>
                {alerts.map((alert) => (
                  <article className='admin-alert-row' key={alert.id}>
                    <span className='admin-alert-indicator' />
                    <div className='admin-alert-copy'>
                      <strong>{alert.messages?.[0]?.sender?.[0]?.name || 'Marketplace member'}</strong>
                      <p>{alert.messages?.[0]?.body || 'A message was flagged for review.'}</p>
                      <div className='admin-alert-phrases'>
                        {(alert.matched_phrases ?? []).slice(0, 3).map((phrase: string) => (
                          <span key={phrase}>{phrase}</span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className='admin-empty-state'>
                <span className='admin-empty-icon'><Shield size={20} /></span>
                <strong>No new alerts</strong>
                <p>Flagged messages will appear here for staff review.</p>
              </div>
            )}
          </section>
        </div>

        <section className='admin-quick-links' aria-label='Admin tools'>
          <div>
            <p className='admin-eyebrow'>Quick access</p>
            <h2>Keep the marketplace moving</h2>
          </div>
          {stats.slice(0, 3).map(({ label, href, Icon }) => (
            <Link href={href} key={href}>
              <Icon size={18} />
              <span>{label}</span>
              <ExternalLink size={14} />
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
