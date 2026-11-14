import Link from 'next/link';
import Image from 'next/image';
import { getSessionProfile } from '@/lib/auth';
import { CARD_SELECT_WITH_SAVED } from '@/lib/queries';
import ListingCard from '@/components/ListingCard';
import HeroListingCarousel from '@/components/HeroListingCarousel';
import EmptyState from '@/components/EmptyState';
import { BadgeCheck, ChevronRight, Laptop, MessageCircle, Search } from '@/components/icons';

const BRAND_LINKS = [
  { name: 'Apple', slug: 'apple' },
  { name: 'Dell', slug: 'dell' },
  { name: 'HP', slug: 'hp' },
  { name: 'Lenovo', slug: 'lenovo' },
  { name: 'ASUS', slug: 'asus' },
  { name: 'Acer', slug: 'acer' },
];

export default async function Home() {
  const { supabase, user, profile } = await getSessionProfile();
  const isGuest = !user;
  const canBrowse = Boolean(user && profile?.role !== 'admin');
  const catalogHref = isGuest ? '/register?next=%2Flaptops' : canBrowse ? '/laptops' : '/admin';
  const catalogLabel = isGuest ? 'Register to see more' : canBrowse ? 'Browse all' : 'Admin dashboard';
  await supabase.rpc('release_expired_reservations');

  const base = () =>
    supabase.from('listings').select(CARD_SELECT_WITH_SAVED).in('status', ['available', 'reserved']).eq('is_visible', true);

  const [featured, newest] = await Promise.all([
    base().eq('is_featured', true).order('created_at', { ascending: false }).limit(4),
    base().order('created_at', { ascending: false }).limit(8),
  ]);
  const heroListings = Array.from(
    new Map(
      [...(featured.data ?? []), ...(newest.data ?? [])].map((listing) => [listing.id, listing])
    ).values()
  ).slice(0, 5);

  return (
    <div className='home-page'>
      <section className='home-hero'>
        <div className='home-hero-copy'>
          <p className='home-hero-kicker'>A marketplace for laptops</p>
          <h1>Good laptops <span>deserve another life.</span></h1>
          <p className='mt-4 max-w-xl text-sm leading-7 text-plum-700 md:text-base'>
            Find a pre-loved laptop with the details that matter up front. Or list yours in minutes with a little help from AI.
          </p>
          {canBrowse ? (
            <form action='/laptops' className='home-search'>
              <input name='q' aria-label='Search laptops' placeholder='Search by keyword, category, price, etc.' />
              <button type='submit' aria-label='Search laptops'>
                <Search size={18} />
              </button>
            </form>
          ) : isGuest ? (
            <Link href={catalogHref} className='home-search home-search-register'>
              <span>Register to see more</span>
              <span className='home-search-register-icon' aria-hidden='true'><ChevronRight size={18} /></span>
            </Link>
          ) : (
            <Link href='/admin' className='home-search home-search-register'>Open admin dashboard</Link>
          )}
        </div>

        <div className='home-hero-spotlight'>
          <HeroListingCarousel listings={heroListings} guest={isGuest} />
        </div>
      </section>

      {profile?.role !== 'admin' && (
        <section className='brand-strip' aria-label='Laptop brands'>
            <div className='brand-strip-links'>
              <div className='brand-strip-track'>
                {[false, true].map((isDuplicate) => (
                  <div
                    key={isDuplicate ? 'duplicate' : 'brands'}
                    className='brand-strip-group'
                    aria-hidden={isDuplicate || undefined}
                  >
                    {BRAND_LINKS.map(({ name, slug }) => (
                      <Link
                        key={slug}
                        className='brand-strip-brand'
                        href={isGuest
                          ? '/register?next=' + encodeURIComponent('/laptops?brand=' + encodeURIComponent(name))
                          : '/laptops?brand=' + encodeURIComponent(name)}
                        aria-label={`${name} laptops`}
                        tabIndex={isDuplicate ? -1 : undefined}
                      >
                        <Image
                          src={`/brand-logos/${slug}.svg`}
                          alt=''
                          aria-hidden='true'
                          width={48}
                          height={48}
                          className='brand-strip-logo'
                        />
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
          </div>
        </section>
      )}

      {featured.data && featured.data.length > 0 && (
        <section>
          <div className='home-section-heading'>
            <div>
              <p className='mb-2 text-xs font-medium text-gray-500'>Selected for you</p>
              <h2>Featured laptops</h2>
            </div>
            <Link href={catalogHref}>{catalogLabel}</Link>
          </div>
          <div className='grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4'>
            {featured.data.map((listing: any) => <ListingCard key={listing.id} listing={listing} guest={isGuest} />)}
          </div>
        </section>
      )}

      <section>
        <div className='home-section-heading'>
          <div>
            <p className='mb-2 text-xs font-medium text-gray-500'>New to the marketplace</p>
            <h2>Recently listed</h2>
          </div>
          <Link href={catalogHref}>{isGuest ? 'Register to see more' : canBrowse ? 'See all laptops' : 'Admin dashboard'}</Link>
        </div>
        {newest.data && newest.data.length > 0 ? (
          <div className='grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4'>
            {newest.data.map((listing: any) => <ListingCard key={listing.id} listing={listing} guest={isGuest} />)}
          </div>
        ) : (
          <EmptyState
            title='No laptops listed yet'
            hint='Be the first to give a good laptop a new home.'
            href={isGuest ? '/register?next=%2Fsell' : '/sell'}
            action={isGuest ? 'Register to sell' : 'Sell a laptop'}
          />
        )}
      </section>

      <section id='how-it-works' className='editorial-section how-it-works'>
        <div className='promise-heading'>
          <p className='promise-eyebrow'>Our promise</p>
          <h2>Less guessing. <span className='accent-text'>Better hand-me-downs.</span></h2>
          <p>
            Frugl brings the model, specs, condition, and seller notes together, so you can make a more informed choice.
          </p>
        </div>
        <div className='step-grid'>
          <article className='step-tile'>
            <span className='step-icon-tile' aria-hidden='true'><Laptop size={24} /></span>
            <h3>Show us what you have</h3>
            <p>Share a few photos, including the model sticker, to start a listing.</p>
          </article>
          <article className='step-tile'>
            <span className='step-icon-tile' aria-hidden='true'><BadgeCheck size={24} /></span>
            <h3>Review the details</h3>
            <p>AI suggests the model and specs. Sellers check everything before publishing.</p>
          </article>
          <article className='step-tile'>
            <span className='step-icon-tile' aria-hidden='true'><MessageCircle size={24} /></span>
            <h3>Talk it through</h3>
            <p>Ask questions, compare details, and arrange a handover with the seller.</p>
          </article>
        </div>
      </section>

      <section className='home-cta'>
        <div className='home-cta-copy'>
          <h2>Ready to find a laptop that fits?</h2>
          <p>{isGuest ? 'Register to browse the full catalog and compare the details that matter.' : 'Browse real listings, compare the specs, and take it from there.'}</p>
        </div>
        <Link href={catalogHref}>{isGuest ? 'Register to see more' : canBrowse ? 'Explore laptops' : 'Admin dashboard'}</Link>
      </section>
    </div>
  );
}
