'use client';

import { useMemo, useRef, useState } from 'react';
import { Fragment } from 'react';
import ListingCard from '@/components/ListingCard';
import EmptyState from '@/components/EmptyState';
import { ChevronDown, Search } from '@/components/icons';
import Chevron from '@/components/motion/Chevron';
import Popover from '@/components/motion/Popover';
import Stagger from '@/components/motion/Stagger';
import StaggerItem from '@/components/motion/StaggerItem';

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
  const statuses = isOwnProfile ? OWNER_STATUSES : PUBLIC_STATUSES;

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
              type='button'
              className='seller-listings-filter-trigger'
              aria-expanded={isFilterOpen}
              aria-controls='seller-listing-status-filters'
              onClick={() => setIsFilterOpen((open) => !open)}
            >
              Filters
              <span className='seller-listings-filter-count'>{selectedStatuses.length}</span>
              <Chevron open={isFilterOpen} className='seller-listings-filter-chevron'>
                <ChevronDown size={14} />
              </Chevron>
            </button>
            <Popover
              open={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              align='right'
              anchorRef={filterRef}
              id='seller-listing-status-filters'
              className='seller-listings-filter-menu'
              ariaLabel='Listing status filters'
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
            </Popover>
          </div>
        </div>
      </div>

      {listings.length === 0 ? (
        <EmptyState title='No active listings' />
      ) : filteredListings.length > 0 ? (
        <Stagger className='grid grid-cols-2 gap-4 md:grid-cols-4'>
          {filteredListings.map((listing, index) => (
            index < 4 ? (
              <Fragment key={listing.id}>
                <ListingCard listing={listing} />
              </Fragment>
            ) : (
              <StaggerItem key={listing.id} index={index - 4}>
                <ListingCard listing={listing} />
              </StaggerItem>
            )
          ))}
        </Stagger>
      ) : (
        <EmptyState
          title='No matching listings'
          hint='Try a different search or filter.'
        />
      )}
    </section>
  );
}
