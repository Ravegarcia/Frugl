'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { conditionLabel, formatPrice } from '@/lib/constants';
import { coverUrl } from '@/lib/queries';
import { ChevronLeft, ChevronRight, Laptop } from '@/components/icons';

const ROTATION_INTERVAL = 5000;

type HeroListing = {
  id: string;
  title: string;
  price: number | string | null;
  condition?: string | null;
  location?: string | null;
  cpu?: string | null;
  ram?: string | null;
  storage?: string | null;
  listing_photos?: { image_url: string; sort_order: number }[] | null;
};

export default function HeroListingCarousel({ listings, guest = false }: { listings: HeroListing[]; guest?: boolean }) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeIndex = listings.length ? selectedIndex % listings.length : 0;
  const [direction, setDirection] = useState<'next' | 'previous'>('next');
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isInViewport, setIsInViewport] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const activeListing = listings[activeIndex];
  const isRotating = listings.length > 1
    && !isHovered
    && !hasFocus
    && isInViewport
    && isPageVisible
    && !prefersReducedMotion;

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setIsPageVisible(!document.hidden);
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    const element = carouselRef.current;
    if (!element || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsInViewport(entry.isIntersecting);
    }, { threshold: 0.25 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isRotating) return;
    const timer = window.setInterval(() => {
      setDirection('next');
      setSelectedIndex((index) => (index + 1) % listings.length);
    }, ROTATION_INTERVAL);
    return () => window.clearInterval(timer);
  }, [isRotating, listings.length]);

  function showListing(index: number, slideDirection?: 'next' | 'previous') {
    if (index === activeIndex) return;
    setDirection(slideDirection ?? (index > activeIndex ? 'next' : 'previous'));
    setSelectedIndex(index);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight' && listings.length > 1) {
      event.preventDefault();
      setDirection('next');
      setSelectedIndex((index) => (index + 1) % listings.length);
    } else if (event.key === 'ArrowLeft' && listings.length > 1) {
      event.preventDefault();
      setDirection('previous');
      setSelectedIndex((index) => (index - 1 + listings.length) % listings.length);
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setHasFocus(false);
    }
  }

  if (!activeListing) {
    return (
      <div className='hero-carousel-empty'>
        <Laptop size={48} />
        <h2>Find your next laptop</h2>
        <p>{guest ? 'Register to explore verified details and recent listings.' : 'Browse verified details and recent listings from the Frugl community.'}</p>
        <Link href={guest ? '/register?next=%2Flaptops' : '/laptops'}>
          {guest ? 'Register to see more' : 'Browse laptops'}
        </Link>
      </div>
    );
  }

  const image = coverUrl(activeListing);
  const listingPath = `/laptops/${activeListing.id}`;
  const listingHref = guest ? '/register?next=' + encodeURIComponent(listingPath) : listingPath;
  const specs = [activeListing.cpu, activeListing.ram, activeListing.storage].filter(Boolean).join(' · ');
  const condition = conditionLabel(activeListing.condition);

  return (
    <div
      ref={carouselRef}
      className='hero-carousel'
      role='region'
      aria-label='Featured laptop listings'
      aria-roledescription='carousel'
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setHasFocus(true)}
      onBlurCapture={handleBlur}
    >
      <article
        key={activeListing.id}
        className={`hero-carousel-slide slide-${direction}`}
        role='group'
        aria-roledescription='slide'
        aria-label={`${activeIndex + 1} of ${listings.length}`}
        aria-live={isRotating ? 'off' : 'polite'}
      >
        <div className='hero-carousel-image'>
          {image ? (
            <img src={image} alt={activeListing.title} />
          ) : (
            <div className='hero-carousel-placeholder'>
              <Laptop size={88} />
              <span>No photo available</span>
            </div>
          )}
        </div>

        <div className='hero-carousel-content'>
          <span className='hero-carousel-sticker'>A laptop to consider</span>
          {condition && <span className='hero-carousel-condition'>{condition}</span>}
          <div className='hero-carousel-copy'>
            <p className='hero-carousel-eyebrow'>
              {activeListing.location ? `Listed in ${activeListing.location}` : 'From the Frugl marketplace'}
            </p>
            <Link href={listingHref} className='hero-carousel-title'>
              {activeListing.title}
            </Link>
            {specs && <p className='hero-carousel-specs'>{specs}</p>}
            {activeListing.price !== null && activeListing.price !== '' && (
              <span className='hero-carousel-price'>{formatPrice(activeListing.price)}</span>
            )}
            <Link href={listingHref} className='hero-carousel-view'>
              {guest ? 'Register to see more' : 'View laptop'} <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </article>

      <div className='hero-carousel-footer'>
        <div className='hero-carousel-pagination' role='group' aria-label='Choose a laptop'>
          {listings.length > 1 && (
            <button
              type='button'
              className='hero-carousel-arrow'
              aria-label='Previous laptop'
              onClick={() => showListing((activeIndex - 1 + listings.length) % listings.length, 'previous')}
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <div className='hero-carousel-dots'>
            {listings.map((listing, index) => (
              <button
                key={listing.id}
                type='button'
                className={index === activeIndex ? 'is-active' : ''}
                aria-label={`Show laptop ${index + 1}: ${listing.title}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                onClick={() => showListing(index)}
              />
            ))}
          </div>
          {listings.length > 1 && (
            <button
              type='button'
              className='hero-carousel-arrow'
              aria-label='Next laptop'
              onClick={() => showListing((activeIndex + 1) % listings.length, 'next')}
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
        <span className='hero-carousel-count' aria-label={`Slide ${activeIndex + 1} of ${listings.length}`}>
          {activeIndex + 1} / {listings.length}
        </span>
      </div>
      {listings.length > 1 && (
        <div className='hero-carousel-timer' aria-hidden='true'>
          <span
            key={`${activeIndex}-${isRotating}`}
            className={isRotating ? 'is-running' : ''}
            style={{ animationDuration: `${ROTATION_INTERVAL}ms` }}
          />
        </div>
      )}
      <span className='sr-only'>
        {listings.length > 1
          ? prefersReducedMotion
            ? 'Automatic rotation is disabled by your motion preference.'
            : 'Slides rotate every five seconds and pause while hovered, focused, or hidden.'
          : 'One listed laptop is available.'}
      </span>
    </div>
  );
}
