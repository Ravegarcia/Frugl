'use client';

import Link from 'next/link';

type StatusTab = {
  key: string;
  label: string;
  count: number;
};

export default function ListingStatusNav({
  tabs,
  activeTab,
  hrefBase = '/dashboard',
  ariaLabel = 'Filter listings by status',
}: {
  tabs: StatusTab[];
  activeTab: string;
  hrefBase?: string;
  ariaLabel?: string;
}) {
  const activeIndex = tabs.findIndex((tab) => tab.key === activeTab);

  return (
    <nav
      className='seller-dashboard-status-nav'
      aria-label={ariaLabel}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`${hrefBase}?tab=${encodeURIComponent(tab.key)}`}
          aria-current={activeTab === tab.key ? 'page' : undefined}
          className={`seller-dashboard-status-tab${activeTab === tab.key ? ' is-active' : ''}`}
        >
          <span className='seller-dashboard-status-label'>{tab.label}</span>
          <span className='seller-dashboard-status-count'>{tab.count}</span>
        </Link>
      ))}
      <span
        className='seller-dashboard-status-indicator'
        aria-hidden='true'
        style={{
          width: `${100 / tabs.length}%`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
    </nav>
  );
}
