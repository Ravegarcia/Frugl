import { requireMarketplaceUser } from '@/lib/auth';
import LeaveReviewForm from './LeaveReviewForm';

export default async function NewReviewPage({ searchParams }: { searchParams: Promise<{ listingId?: string }> }) {
  const { listingId } = await searchParams;
  const { supabase, user } = await requireMarketplaceUser('/reviews/new');

  let listing: any = null;
  let otherParty: any = null;

  if (listingId) {
    const { data } = await supabase
      .from('listings')
      .select('*, seller:profiles!listings_seller_id_fkey(id, name), buyer:profiles!listings_buyer_id_fkey(id, name)')
      .eq('id', listingId)
      .eq('status', 'sold')
      .maybeSingle();

    if (data) {
      listing = data;
      const isSeller = data.seller_id === user.id;
      otherParty = isSeller ? data.buyer : data.seller;
    }
  }

  return (
    <div className='py-4'>
      <LeaveReviewForm
        userId={user.id}
        listing={listing}
        otherParty={otherParty}
      />
    </div>
  );
}
