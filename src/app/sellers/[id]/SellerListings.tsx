'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ListingCard from '@/components/ListingCard';
import EmptyState from '@/components/EmptyState';
import { ChevronDown, Search } from '@/components/icons';

type SellerListing = {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  location: string | null;
  status: string;
};

const PUBLIC_STATUSES = [
  { value: 'available', label: 'Active' },
  { value: 'reserved', label: 'Reserved' },
];
const OWNER_STATUSES = [
  ...PUBLIC_STATUSES.slice(0, 1),
  { value: 'draft', label: 'Draft' },
  ...PUBLIC_STATUSES.slice(1),
  { value: 'sold', label: 'Sold' },
];

export default function SellerListings({
  listings,
  isOwnProfile,
}: {
  listings: SellerListing[];
  isOwnProfile: boolean;
}) {
  const [query, setQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState(['available', 'reserved']);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const statuses = isOwnProfile ? OWNER_STATUSES : PUBLIC_STATUSES;

  useEffect(() => {
    if (!isFilterOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) setIsFilterOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterOpen(false);
        filterTriggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFilterOpen]);

  const filteredListings = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return listings.filter((listing) => {
      const matchesQuery = !term || [
        listing.title,
        listing.brand,
        listing.model,
        listing.location,
      ].some((value) => value?.toLocaleLowerCase().includes(term));
      const matchesStatus = selectedStatuses.includes(listing.status);
      return matchesQuery && matchesStatus;
    });
  }, [listings, query, selectedStatuses]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses((current) => current.includes(status)
      ? current.filter((value) => value !== status)
      : [...current, status]);
  };

  return (
    <section className='seller-listings-section'>
      <div className='seller-listings-toolbar'>
        <h2 className='font-semibold'>Listings</h2>
        <div className='seller-listings-controls'>
          <label className='seller-listings-search'>
            <Search size={16} />
            <span className='sr-only'>Search listings</span>
            <input
              type='search'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Search listings'
            />
          </label>
          <div className='seller-listings-filter' ref={filterRef}>
            <button
              ref={filterTriggerRef}
              type='button'
              className='seller-listings-filter-trigger'
              aria-expanded={isFilterOpen}
              aria-controls='seller-listing-status-filters'
              onClick={() => setIsFilterOpen((open) => !open)}
            >
              Filters
              <span className='seller-listings-filter-count'>{selectedStatuses.length}</span>
              <ChevronDown
                size={14}
                className={`seller-listings-filter-chevron${isFilterOpen ? ' is-open' : ''}`}
              />
            </button>
            <div
              id='seller-listing-status-filters'
              className='seller-listings-filter-menu'
              data-open={isFilterOpen}
              aria-hidden={!isFilterOpen}
              inert={!isFilterOpen}
            >
              <fieldset>
                <legend>Listing status</legend>
                {statuses.map((status) => (
                  <label key={status.value} className='seller-listings-filter-option'>
                    <input
                      type='checkbox'
                      checked={selectedStatuses.includes(status.value)}
                      onChange={() => toggleStatus(status.value)}
                      tabIndex={isFilterOpen ? 0 : -1}
                    />
                    <span>{status.label}</span>
                  </label>
                ))}
              </fieldset>
            </div>
          </div>
        </div>
      </div>

      {listings.length === 0 ? (
        <EmptyState title='No active listings' />
      ) : filteredListings.length > 0 ? (
        <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
          {filteredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <EmptyState
          title='No matching listings'
          hint='Try a different search or filter.'
        />
      )}
    </section>
  );
}
