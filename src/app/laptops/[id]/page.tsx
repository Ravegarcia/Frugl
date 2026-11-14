import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionProfile } from '@/lib/auth';
import { CARD_SELECT_WITH_SAVED } from '@/lib/queries';
import { formatPrice } from '@/lib/constants';
import ListingDetails from '@/components/ListingDetails';
import ListingActions from '@/components/ListingActions';
import ListingCard from '@/components/ListingCard';

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await getSessionProfile();
  if (!user) redirect('/register?next=' + encodeURIComponent('/laptops/' + id));

  const { data: listing } = await supabase
    .from('listings')
    .select('*, listing_photos(image_url, sort_order), condition_reports(*)')
    .eq('id', id)
    .maybeSingle();
  if (!listing) notFound();
  if (listing.status === 'draft') redirect('/sell/' + id);

  const photos = [...(listing.listing_photos ?? [])]
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((p: any) => p.image_url);
  const report: any = Array.isArray(listing.condition_reports) ? listing.condition_reports[0] : listing.condition_reports;

  if (profile?.role !== 'admin' && user?.id !== listing.seller_id) {
    await supabase.rpc('increment_views', { p_listing: id });
  }

  const { data: seller } = await supabase.from('profiles').select('id,name,seller_verified').eq('id', listing.seller_id).single();

  let price: any = null;
  if (listing.model_id && listing.condition) {
    const res = await supabase
      .from('price_reports').select('low,median,high,is_estimate')
      .eq('model_id', listing.model_id).eq('condition', listing.condition).limit(1).maybeSingle();
    price = res.data;
  }
  let fair = '';
  if (price && listing.price) {
    const p = Number(listing.price);
    fair = p < Number(price.low) ? 'Below the typical price' : p > Number(price.high) ? 'Above the typical price' : 'Within the typical price range';
  }

  let saved = false;
  if (user && profile?.role !== 'admin') {
    const res = await supabase.from('saved_listings').select('listing_id').eq('user_id', user.id).eq('listing_id', id).maybeSingle();
    saved = !!res.data;
  }

  let similarQuery = supabase.from('listings').select(CARD_SELECT_WITH_SAVED).in('status', ['available', 'reserved']).neq('id', id).limit(4);
  similarQuery = listing.model_id ? similarQuery.eq('model_id', listing.model_id) : similarQuery.eq('brand', listing.brand);
  const { data: similar } = await similarQuery;

  const checklist = report
    ? [['Battery', report.battery_health], ['Screen', report.screen_grade], ['Keyboard', report.keyboard_grade], ['Hinge', report.hinge_grade], ['Ports', report.ports], ['Charger', report.charger]].filter(([, v]) => v)
    : [];

  return (
    <div className='space-y-8'>
      <div className='grid gap-6 md:grid-cols-[1fr_20rem]'>
        <ListingDetails listing={listing} photos={photos} seller={seller}>
          {price && (
            <div className='rounded-xl border bg-white p-3 text-sm'>
              <p className='font-medium'>{fair}</p>
              <p className='text-gray-500'>
                Typical range for this model and condition: {formatPrice(price.low)} to {formatPrice(price.high)}
                {price.is_estimate ? ' (estimate)' : ''}
              </p>
            </div>
          )}
          {checklist.length > 0 && (
            <div className='rounded-xl border bg-white p-3 text-sm'>
              <p className='mb-1 font-medium'>Condition report (reported by the seller)</p>
              <ul className='grid grid-cols-2 gap-1'>
                {checklist.map(([k, v]) => <li key={k}>{k}: {v}</li>)}
              </ul>
            </div>
          )}
        </ListingDetails>
        <aside className='h-fit md:sticky md:top-24'>
          {profile?.role === 'admin' ? (
            <div className='space-y-2 rounded-xl border bg-white p-4'>
              <p className='text-sm'>Marketplace actions are disabled for admin accounts.</p>
              <Link href='/admin/listings' className='text-sm font-medium text-plum-700 underline'>Manage listings</Link>
            </div>
          ) : (
            <ListingActions listingId={id} sellerId={listing.seller_id} status={listing.status} userId={user?.id ?? null} initialSaved={saved} />
          )}
        </aside>
      </div>

      {similar && similar.length > 0 && (
        <section>
          <h2 className='mb-3 text-lg font-semibold'>Similar laptops</h2>
          <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
            {similar.map((l: any) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </section>
      )}
    </div>
  );
}
