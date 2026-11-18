'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { conditionLabel, formatPrice } from '@/lib/constants';
import { coverUrl } from '@/lib/queries';
import { ChevronLeft, ChevronRight, Laptop } from '@/components/icons';
import Stagger from '@/components/motion/Stagger';
import StaggerItem from '@/components/motion/StaggerItem';

interface Listing {
  id: string;
  title: string;
  price: number;
  condition: string | null;
  brand: string | null;
  ram: string | null;
  storage: string | null;
  listing_photos?: { image_url: string; sort_order: number }[] | null;
}

export default function BrowseIntroShowcase({ listings }: { listings: Listing[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const listingKey = listings.map((listing) => listing.id).join(':');

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    track.scrollLeft = 0;
    const updatePosition = () => {
      setCanScrollPrevious(track.scrollLeft > 2);
      setCanScrollNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 2);
    };

    updatePosition();
    track.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition);
    return () => {
      track.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [listingKey]);

  function move(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;

    const card = track.querySelector<HTMLElement>('.browse-intro-product');
    const gap = Number.parseFloat(
      window.getComputedStyle(card?.parentElement?.parentElement ?? track).columnGap
    ) || 0;
    const step = (card?.getBoundingClientRect().width ?? track.clientWidth) + gap;
    track.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  return (
    <div className='browse-intro-showcase'>
      <div className='browse-intro-showcase-heading'>
        <span>From the marketplace</span>
      </div>
      {listings.length > 0 ? (
        <div
          ref={trackRef}
          className='browse-intro-product-track'
          role='region'
          aria-label='Laptop listings carousel'
          tabIndex={0}
        >
          <Stagger className='browse-intro-product-items'>
            {listings.map((listing, index) => {
              const image = coverUrl(listing);
              return (
                <StaggerItem
                  key={listing.id}
                  index={index}
                  initiallyVisible={index === 0}
                  className='browse-intro-product-slot'
                >
                  <Link href={`/laptops/${listing.id}`} className='browse-intro-product'>
                    <span className='browse-intro-product-image'>
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt={listing.title} />
                      ) : (
                        <Laptop size={34} />
                      )}
                      <span className='browse-intro-product-condition'>{conditionLabel(listing.condition) || 'Laptop'}</span>
                    </span>
                    <span className='browse-intro-product-details'>
                      <strong>{listing.title}</strong>
                      <span>{[listing.ram, listing.storage].filter(Boolean).join(' · ') || listing.brand || 'Community listing'}</span>
                      <b>{formatPrice(listing.price)}</b>
                    </span>
                    <span className='browse-intro-product-arrow' aria-hidden='true'><ChevronRight size={14} /></span>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      ) : (
        <div className='browse-intro-no-products'>
          <Laptop size={36} />
          <div>
            <strong>No matches yet</strong>
            <span>Clear a filter to explore more laptops.</span>
          </div>
          <Link href='/laptops' aria-label='Clear filters and browse all laptops'><ChevronRight size={17} /></Link>
        </div>
      )}
      {listings.length > 0 && (
        <div className='browse-intro-carousel-controls'>
          <button
            type='button'
            aria-label='Previous laptops'
            disabled={!canScrollPrevious}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type='button'
            aria-label='Next laptops'
            disabled={!canScrollNext}
            onClick={() => move(1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
