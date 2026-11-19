'use client';

import Link from 'next/link';
import TabIndicator from '@/components/motion/TabIndicator';

type StatusTab = {
  key: string;
  label: string;
  count: number;
};

export default function ListingStatusNav({
  tabs,
  activeTab,
  hrefBase = '/dashboard',
  paramName = 'tab',
  ariaLabel = 'Filter listings by status',
}: {
  tabs: StatusTab[];
  activeTab: string;
  hrefBase?: string;
  paramName?: string;
  ariaLabel?: string;
}) {
  return (
    <nav
      className='seller-dashboard-status-nav'
      aria-label={ariaLabel}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`${hrefBase}?${new URLSearchParams({ [paramName]: tab.key })}`}
          aria-current={activeTab === tab.key ? 'page' : undefined}
          className={`seller-dashboard-status-tab${activeTab === tab.key ? ' is-active' : ''}`}
        >
          <span className='seller-dashboard-status-label'>{tab.label}</span>
          <span className='seller-dashboard-status-count'>{tab.count}</span>
          {activeTab === tab.key && (
            <TabIndicator groupId={hrefBase} className='seller-dashboard-status-indicator' />
          )}
        </Link>
      ))}
    </nav>
  );
}
