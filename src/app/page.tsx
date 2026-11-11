import Link from 'next/link';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CARD_SELECT, coverUrl } from '@/lib/queries';
import { formatPrice } from '@/lib/constants';
import ListingCard from '@/components/ListingCard';
import EmptyState from '@/components/EmptyState';
import { Laptop } from '@/components/icons';

const BRAND_LINKS = ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer'];
const PRICE_LINKS = [
  ['Under ₱20,000', '?max=20000'],
  ['₱20,000 to ₱40,000', '?min=20000&max=40000'],
  ['Over ₱40,000', '?min=40000'],
];

export default async function Home() {
  await connection();
  const supabase = await createClient();
  await supabase.rpc('release_expired_reservations');

  const base = () =>
    supabase.from('listings').select(CARD_SELECT).in('status', ['available', 'reserved']).eq('is_visible', true);

  const [featured, newest] = await Promise.all([
    base().eq('is_featured', true).order('created_at', { ascending: false }).limit(4),
    base().order('created_at', { ascending: false }).limit(8),
  ]);
  const spotlight = featured.data?.[0] ?? newest.data?.[0] ?? null;
  const spotlightImage = spotlight ? coverUrl(spotlight) : null;

  return (
    <div className='home-page'>
      <section className='home-hero'>
        <div className='home-hero-copy'>
          <p className='home-hero-kicker'>The laptop-only marketplace</p>
          <h1>Good laptops <span>deserve another life.</span></h1>
          <p className='mt-4 max-w-xl text-sm leading-7 text-[#d1c0e2] md:text-base'>
            Find a pre-loved laptop with the details that matter up front. Or list yours in minutes with a little help from AI.
          </p>
          <form action='/laptops' className='home-search'>
            <input name='q' aria-label='Search laptops' placeholder='Search MacBook, ThinkPad, Ryzen 7…' />
            <button type='submit'>Find a laptop</button>
          </form>
          <div className='hero-quick-links' aria-label='Popular brands'>
            {BRAND_LINKS.map((brand) => (
              <Link key={brand} href={'/laptops?brand=' + encodeURIComponent(brand)}>{brand}</Link>
            ))}
            {PRICE_LINKS.map(([label, query]) => (
              <Link key={label} href={'/laptops' + query}>{label}</Link>
            ))}
          </div>
        </div>

        <div className='home-hero-spotlight'>
          <Link
            href={spotlight ? '/laptops/' + spotlight.id : '/laptops'}
            className='hero-spotlight block'
            aria-label={spotlight ? 'View ' + spotlight.title : 'Browse laptops'}
          >
            <div className='hero-spotlight-image'>
              {spotlightImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={spotlightImage} alt={spotlight?.title ?? 'Laptop listed on Frugl'} />
              ) : (
                <Laptop className='placeholder-laptop' size={144} />
              )}
              <span className='hero-spotlight-sticker'>Catalog-backed details</span>
            </div>
            <div className='hero-spotlight-caption'>
              <div>
                <p className='text-xs'>A good place to start</p>
                <p className='mt-1 font-medium'>{spotlight?.title ?? 'Find your next laptop'}</p>
              </div>
              {spotlight?.price && <span className='price'>{formatPrice(spotlight.price)}</span>}
            </div>
          </Link>
        </div>
      </section>

      {featured.data && featured.data.length > 0 && (
        <section>
          <div className='home-section-heading'>
            <div>
              <p className='mb-2 text-xs font-medium text-gray-500'>Selected for you</p>
              <h2>Featured laptops</h2>
            </div>
            <Link href='/laptops'>Browse all</Link>
          </div>
          <div className='grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4'>
            {featured.data.map((listing: any) => <ListingCard key={listing.id} listing={listing} />)}
          </div>
        </section>
      )}

      <section>
        <div className='home-section-heading'>
          <div>
            <p className='mb-2 text-xs font-medium text-gray-500'>New to the marketplace</p>
            <h2>Recently listed</h2>
          </div>
          <Link href='/laptops'>See all laptops</Link>
        </div>
        {newest.data && newest.data.length > 0 ? (
          <div className='grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4'>
            {newest.data.map((listing: any) => <ListingCard key={listing.id} listing={listing} />)}
          </div>
        ) : (
          <EmptyState title='No laptops listed yet' hint='Be the first to give a good laptop a new home.' href='/sell' action='Sell a laptop' />
        )}
      </section>

      <section id='how-it-works' className='editorial-section how-it-works'>
        <p className='text-xs font-medium text-[#d1c0e2]'>Made for buying and selling laptops</p>
        <h2>Less guessing. <span className='accent-text'>Better hand-me-downs.</span></h2>
        <p>
          Frugl brings the model, specs, condition, and seller notes together, so you can make a more informed choice.
        </p>
        <div className='step-grid'>
          <article className='step-tile'>
            <span className='step-number'>01</span>
            <h3>Show us what you have</h3>
            <p>Sellers add a few photos and a close-up of the model sticker.</p>
          </article>
          <article className='step-tile'>
            <span className='step-number'>02</span>
            <h3>Review the details</h3>
            <p>AI suggests a model and catalog specs. Sellers check and edit before publishing.</p>
          </article>
          <article className='step-tile'>
            <span className='step-number'>03</span>
            <h3>Talk it through</h3>
            <p>Message the seller, ask questions, and arrange a handover that works for you.</p>
          </article>
        </div>
      </section>

      <section className='home-cta'>
        <div>
          <h2>Ready to find a laptop that fits?</h2>
          <p>Browse real listings, compare the specs, and take it from there.</p>
        </div>
        <Link href='/laptops'>Explore laptops</Link>
      </section>
    </div>
  );
}
