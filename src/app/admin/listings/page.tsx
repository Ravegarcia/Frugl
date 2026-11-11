import { requireStaff } from '@/lib/auth';
import { formatPrice } from '@/lib/constants';
import { coverUrl } from '@/lib/queries';
import Link from 'next/link';
import AdminListingToggle from './AdminListingToggle';

export default async function AdminListingsPage() {
  const { supabase } = await requireStaff();

  const { data: listings } = await supabase
    .from('listings')
    .select('*, listing_photos(image_url, sort_order), seller:profiles!listings_seller_id_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Manage Listings</h1>
          <p className='text-sm text-gray-500'>Toggle visibility, feature listings, or review details.</p>
        </div>
        <Link href='/admin' className='text-xs text-gray-500 underline'>
          Back to Admin Hub
        </Link>
      </div>

      <div className='divide-y rounded-xl border bg-white shadow-sm overflow-hidden'>
        {(listings || []).map((l: any) => {
          const cover = coverUrl(l);
          return (
            <div key={l.id} className='flex items-center justify-between p-4'>
              <div className='flex items-center gap-3'>
                <div className='h-12 w-12 rounded border bg-gray-100 overflow-hidden shrink-0'>
                  {cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={cover} alt='' className='h-full w-full object-cover' />
                  ) : (
                    <div className='flex h-full items-center justify-center text-[9px] text-gray-400'>
                      No photo
                    </div>
                  )}
                </div>
                <div>
                  <Link href={`/laptops/${l.id}`} className='text-sm font-semibold hover:underline line-clamp-1'>
                    {l.title || 'Untitled'}
                  </Link>
                  <p className='text-xs text-gray-500'>
                    Seller: <span className='font-medium text-gray-800'>{l.seller?.name || 'User'}</span> · {formatPrice(l.price)} · <span className='capitalize'>{l.status}</span>
                  </p>
                </div>
              </div>

              <AdminListingToggle listingId={l.id} initialVisible={l.is_visible} initialFeatured={l.is_featured} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
