/* eslint-disable @next/next/no-img-element */
'use client';
import { useEffect, useRef, useState } from 'react';
import { conditionLabel, dealLabel, formatPrice } from '@/lib/constants';
import TimeAgo from '@/components/TimeAgo';
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Laptop,
} from '@/components/icons';
import Reveal from '@/components/motion/Reveal';

type Props = {
  listing: any;
  photos: string[];
  trackView?: boolean;
  checklist?: [string, string][];
};

export default function ListingDetails({
  listing,
  photos,
  trackView = false,
  checklist = [],
}: Props) {
  const [index, setIndex] = useState(0);
  const totalPhotos = photos.length;
  const safeIndex = totalPhotos > 0 ? Math.min(index, totalPhotos - 1) : 0;
  const current = photos[safeIndex];
  const listedAt = listing.published_at ?? listing.created_at;
  const trackedViewId = useRef<string | null>(null);

  useEffect(() => {
    if (!trackView || trackedViewId.current === listing.id) return;
    trackedViewId.current = listing.id;

    void fetch(`/api/listings/${encodeURIComponent(listing.id)}/view`, {
      method: 'POST',
    }).then((response) => {
      if (!response.ok) console.error('Could not record this listing view.');
    }).catch((error: unknown) => {
      console.error('Could not record this listing view:', error);
    });
  }, [listing.id, trackView]);

  const conditionText = conditionLabel(listing.condition) || 'Pre-owned';
  const dealMethodsText =
    (listing.deal_methods ?? []).map(dealLabel).filter(Boolean).join(', ') || 'Meetup / Pickup';

  const detailsItems = [
    { label: 'Condition', value: conditionText },
    { label: 'Brand', value: listing.brand || '—' },
    { label: 'Model', value: listing.model || '—' },
    { label: 'Deal Method', value: dealMethodsText },
  ];

  const displayAndBuildParts = [
    listing.screen_size ? `${listing.screen_size}-inch display` : '',
    ...checklist.map(([k, v]) => `${k}: ${v}`),
  ].filter(Boolean);

  const displayAndBuildValue =
    displayAndBuildParts.length > 0 ? displayAndBuildParts.join(' · ') : 'Standard display & build';

  const specsItems = [
    { index: 1, label: 'Processor (CPU)', value: listing.cpu || 'Not specified' },
    { index: 2, label: 'Graphics Card (GPU)', value: listing.gpu || 'Not specified' },
    { index: 3, label: 'RAM (Memory)', value: listing.ram || 'Not specified' },
    { index: 4, label: 'Storage (SSD)', value: listing.storage || 'Not specified' },
    { index: 5, label: 'Display and Build', value: displayAndBuildValue },
  ];

  function showPreviousPhoto() {
    if (totalPhotos <= 1) return;
    setIndex((currentIdx) => (currentIdx - 1 + totalPhotos) % totalPhotos);
  }

  function showNextPhoto() {
    if (totalPhotos <= 1) return;
    setIndex((currentIdx) => (currentIdx + 1) % totalPhotos);
  }

  return (
    <div className='product-details-flow'>
      {/* Top Media Showcase */}
      <div className='product-gallery'>
        <div className={`product-gallery-stage${totalPhotos <= 1 ? ' is-single-photo' : ''}`}>
          {current ? (
            <img
              src={current}
              alt={listing.title || 'Laptop photo'}
              className='product-gallery-main-img'
              fetchPriority='high'
            />
          ) : (
            <div className='listing-photo-placeholder'>
              <Laptop size={40} />
              <span>No photos uploaded</span>
            </div>
          )}

          {totalPhotos > 1 && (
            <>
              <button
                type='button'
                onClick={showPreviousPhoto}
                className='product-gallery-nav product-gallery-nav-prev'
                aria-label='Previous photo'
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type='button'
                onClick={showNextPhoto}
                className='product-gallery-nav product-gallery-nav-next'
                aria-label='Next photo'
              >
                <ChevronRight size={16} />
              </button>
              <div className='product-gallery-dots' aria-label='Photo indicator'>
                {photos.map((photo, i) => (
                  <button
                    key={photo + i}
                    type='button'
                    onClick={() => setIndex(i)}
                    className={`product-gallery-dot${i === safeIndex ? ' is-active' : ''}`}
                    aria-label={`Go to photo ${i + 1}`}
                    aria-pressed={i === safeIndex}
                  />
                ))}
              </div>
              <span className='product-gallery-counter'>
                {safeIndex + 1} / {totalPhotos}
              </span>
            </>
          )}
        </div>

        {totalPhotos > 1 && (
          <div className='product-gallery-thumbs'>
            {photos.map((p, i) => (
              <button
                key={p + i}
                type='button'
                aria-pressed={i === safeIndex}
                aria-label={`View photo ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`product-gallery-thumb${i === safeIndex ? ' is-active' : ''}`}
              >
                <img src={p} alt='' loading='lazy' decoding='async' />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 1. Title, Price, Listed time and location */}
      <header className='product-header-block'>
        <div className='product-title-row'>
          <h1 className='product-title'>{listing.title || 'Untitled laptop listing'}</h1>
          {listing.status === 'reserved' && (
            <span className='status-badge status-warning'>Reserved</span>
          )}
          {listing.status === 'sold' && (
            <span className='status-badge status-muted'>Sold</span>
          )}
        </div>

        <p className='product-price'>
          {listing.price ? formatPrice(listing.price) : 'Price on request'}
        </p>

        <p className='product-listed-meta'>
          Listed <TimeAgo timestamp={listedAt} />
          {listing.location ? ` in ${listing.location}` : ''}
        </p>

      </header>

      {/* 2. Details: Condition, Brand, Model, Deal Method */}
      <Reveal as='section' className='product-content-section'>
        <h2>Details</h2>
        <dl className='product-kv-list'>
          {detailsItems.map((item) => (
            <div key={item.label} className='product-kv-row'>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      {/* 3. Specs */}
      <Reveal as='section' className='product-content-section'>
        <div className='product-section-title-row'>
          <h2>Specs</h2>
          {listing.specs_verified && (
            <span className='status-badge status-success'>
              <CheckCircle size={12} />
              Verified specs
            </span>
          )}
        </div>

        <dl className='product-kv-list'>
          {specsItems.map((spec) => (
            <div key={spec.label} className='product-kv-row'>
              <dt>{spec.label}</dt>
              <dd>{spec.value}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      {/* 4. Description */}
      <Reveal as='section' className='product-content-section'>
        <h2>Description</h2>
        <p className='product-description-text'>
          {listing.description || 'No additional description provided by the seller.'}
        </p>
      </Reveal>
    </div>
  );
}
