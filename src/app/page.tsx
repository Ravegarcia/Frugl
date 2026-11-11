import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CARD_SELECT } from '@/lib/queries';
import ListingCard from '@/components/ListingCard';
import EmptyState from '@/components/EmptyState';

const BRAND_LINKS = ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer'];
const PRICE_LINKS = [
  ['Under ₱20,000', '?max=20000'],
  ['₱20,000 to ₱40,000', '?min=20000&max=40000'],
  ['Over ₱40,000', '?min=40000'],
];

export default async function Home() {
  const supabase = await createClient();
  await supabase.rpc('release_expired_reservations');

  const base = () =>
    supabase.from('listings').select(CARD_SELECT).in('status', ['available', 'reserved']).eq('is_visible', true);

  const [featured, newest] = await Promise.all([
    base().eq('is_featured', true).order('created_at', { ascending: false }).limit(4),
    base().order('created_at', { ascending: false }).limit(8),
  ]);

  return (
    <div className='space-y-8'>
      <section className='rounded-2xl bg-emerald-700 p-6 text-white md:p-10'>
        <h1 className='text-2xl font-bold md:text-4xl'>Buy and sell secondhand laptops</h1>
        <p className='mt-2 text-emerald-100'>Specs checked by AI, fair-price hints, safer deals.</p>
        <form action='/laptops' className='mt-4 flex gap-2'>
          <input name='q' placeholder='Search by model, brand or spec' className='flex-1 rounded-md px-3 py-2 text-gray-900' />
          <button className='rounded-md bg-white px-4 py-2 font-medium text-emerald-800'>Search</button>
        </form>
        <div className='mt-4 flex flex-wrap gap-2 text-sm'>
          {BRAND_LINKS.map((b) => (
            <Link key={b} href={'/laptops?brand=' + b} className='rounded-full bg-emerald-600 px-3 py-1'>{b}</Link>
          ))}
          {PRICE_LINKS.map(([label, qs]) => (
            <Link key={label} href={'/laptops' + qs} className='rounded-full bg-emerald-800 px-3 py-1'>{label}</Link>
          ))}
        </div>
      </section>

      {featured.data && featured.data.length > 0 && (
        <section>
          <h2 className='mb-3 text-lg font-semibold'>Featured</h2>
          <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
            {featured.data.map((l: any) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </section>
      )}

      <section>
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='text-lg font-semibold'>Newest laptops</h2>
          <Link href='/laptops' className='text-sm underline'>See all</Link>
        </div>
        {newest.data && newest.data.length > 0 ? (
          <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
            {newest.data.map((l: any) => <ListingCard key={l.id} listing={l} />)}
          </div>
        ) : (
          <EmptyState title='No laptops listed yet' hint='Be the first to list one.' href='/sell' action='Sell a laptop' />
        )}
      </section>
    </div>
  );
}
