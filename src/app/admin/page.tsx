import { Suspense } from 'react';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { AlertTriangle, ExternalLink, Flag, Laptop, Shield, Users } from '@/components/icons';
import { findLagunaMunicipality, type LagunaSellerLocation } from '@/lib/admin/laguna-locations';
import type { createClient } from '@/lib/supabase/server';
import LagunaMemberMapLoader from './LagunaMemberMapLoader';

type DashboardStat = {
  label: string;
  value: number;
  detail: string;
  href: string;
  Icon: typeof Flag;
  tone: 'report' | 'alert' | 'listing' | 'member';
};

async function getLagunaSellerLocations(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<LagunaSellerLocation[]> {
  const sellerLocations = new Map<string, string>();
  const pageSize = 500;

  for (let from = 0; ; from += pageSize) {
    const { data: listings, error } = await supabase
      .from('listings')
      .select('seller_id, location')
      .eq('is_visible', true)
      .in('status', ['available', 'reserved'])
      .order('seller_id')
      .order('id')
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Unable to load active seller locations: ${error.message}`);
    }

    for (const listing of listings ?? []) {
      if (!sellerLocations.has(listing.seller_id)) {
        sellerLocations.set(listing.seller_id, listing.location);
      }
    }

    if (!listings || listings.length < pageSize) break;
  }

  const sellerIds = [...sellerLocations.keys()];
  const sellerCounts = new Map<string, LagunaSellerLocation>();
  const profileBatchSize = 500;

  for (let offset = 0; offset < sellerIds.length; offset += profileBatchSize) {
    const { data: sellers, error } = await supabase
      .from('profiles')
      .select('id, default_location')
      .eq('status', 'active')
      .eq('role', 'buyer')
      .in('id', sellerIds.slice(offset, offset + profileBatchSize));

    if (error) {
      throw new Error(`Unable to load active seller profiles: ${error.message}`);
    }

    for (const seller of sellers ?? []) {
      const location = seller.default_location?.trim() || sellerLocations.get(seller.id) || null;
      const municipality = findLagunaMunicipality(location);
      if (!municipality) continue;

      const existing = sellerCounts.get(municipality.name);
      sellerCounts.set(municipality.name, {
        name: municipality.name,
        coordinates: municipality.coordinates,
        sellerCount: (existing?.sellerCount ?? 0) + 1,
      });
    }
  }

  return [...sellerCounts.values()].sort(
    (first, second) => second.sellerCount - first.sellerCount || first.name.localeCompare(second.name),
  );
}

async function AdminDashboardContent() {
  const { supabase } = await requireStaff();

  const [
    openReportsCount,
    chatAlertsCount,
    activeListingsCount,
    membersCount,
    alertsResult,
    lagunaLocations,
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
      .from('chat_alerts')
      .select('id, matched_phrases, created_at, messages(body, sender:profiles!messages_sender_id_fkey(name))')
      .order('created_at', { ascending: false })
      .limit(4),
    getLagunaSellerLocations(supabase),
  ]);

  const results = [
    openReportsCount,
    chatAlertsCount,
    activeListingsCount,
    membersCount,
    alertsResult,
  ];
  const failedQuery = results.find((result) => result.error);
  if (failedQuery?.error) {
    throw new Error(`Unable to load admin dashboard: ${failedQuery.error.message}`);
  }

  const stats: DashboardStat[] = [
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

  const alerts = alertsResult.data ?? [];
  const totalLagunaSellers = lagunaLocations.reduce(
    (total, location) => total + location.sellerCount,
    0,
  );
  const topLagunaLocations = lagunaLocations.slice(0, 5);
  const mostPopularLocationCount = topLagunaLocations[0]?.sellerCount ?? 0;

  return (
    <>
        <header className='admin-dashboard-header'>
          <div>
            <p className='admin-eyebrow'>Frugl operations</p>
            <h1>Marketplace overview</h1>
            <p>Keep listings trustworthy and help the community trade with confidence.</p>
          </div>
          <Link href='/admin/reports' className='button-primary admin-header-action'>
            Review reports <ExternalLink size={15} />
          </Link>
        </header>

        <section className='admin-stats-grid' aria-label='Marketplace summary'>
          {stats.map(({ label, value, detail, href, Icon, tone }) => (
            <Link href={href} className={`admin-stat-card tone-${tone}`} key={label}>
              <span className='admin-stat-icon'><Icon size={18} /></span>
              <span className='admin-stat-label'>{label}</span>
              <strong>{value.toLocaleString()}</strong>
              <span className='admin-stat-detail'>
                <span>{detail}</span>
              </span>
            </Link>
          ))}
        </section>

        <div className='admin-panels-grid'>
          <section className='admin-panel admin-laguna-panel'>
            <div className='admin-panel-heading'>
              <div>
                <p className='admin-eyebrow'>Marketplace locations</p>
                <h2>Sellers across Laguna</h2>
                <p className='admin-laguna-description'>
                  Approximate city-level counts for sellers with active listings; no exact addresses are shown.
                </p>
              </div>
              <div className='admin-laguna-total'>
                <strong>{totalLagunaSellers.toLocaleString()}</strong>
                <span>sellers mapped</span>
              </div>
            </div>

            <div className='admin-laguna-content'>
              <div className='admin-laguna-map-shell'>
                <LagunaMemberMapLoader locations={lagunaLocations} />
                <span className='admin-laguna-region-label'>Laguna, Philippines</span>
                <a
                  className='admin-laguna-map-attribution'
                  href='https://www.openstreetmap.org/copyright'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  © OpenStreetMap contributors
                </a>
              </div>

              <aside className='admin-laguna-breakdown' aria-label='Top seller locations in Laguna'>
                <div className='admin-laguna-breakdown-heading'>
                  <strong>Top locations</strong>
                  <span>{lagunaLocations.length} areas</span>
                </div>
                {topLagunaLocations.length ? (
                  <div className='admin-laguna-location-list'>
                    {topLagunaLocations.map((location) => (
                      <div className='admin-laguna-location-row' key={location.name}>
                        <div className='admin-laguna-location-copy'>
                          <strong>{location.name}</strong>
                          <span>
                            {location.sellerCount.toLocaleString()}{' '}
                            {location.sellerCount === 1 ? 'seller' : 'sellers'}
                          </span>
                        </div>
                        <div className='admin-laguna-location-track' aria-hidden='true'>
                          <span
                            style={{
                              width: `${(location.sellerCount / mostPopularLocationCount) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='admin-laguna-empty'>
                    <strong>No Laguna sellers yet</strong>
                    <span>Sellers with active listings will appear here when available.</span>
                  </div>
                )}
              </aside>
            </div>
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
    </>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className='admin-dashboard-content-loading' role='status'>
          Loading marketplace overview...
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
