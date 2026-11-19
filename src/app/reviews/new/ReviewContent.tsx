import { redirect } from 'next/navigation';
import { requireMarketplaceUser } from '@/lib/auth';
import LeaveReviewForm from './LeaveReviewForm';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ReviewListing = { id: string; title: string };
type ReviewParty = { id: string; name: string | null };

function firstRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

export default async function ReviewContent({
  searchParams,
  inModal = false,
}: {
  searchParams: Promise<{ listingId?: string; transactionId?: string }>;
  inModal?: boolean;
}) {
  const { listingId, transactionId } = await searchParams;
  const returnTo = transactionId && UUID_PATTERN.test(transactionId)
    ? `/reviews/new?transactionId=${encodeURIComponent(transactionId)}`
    : '/reviews/new';
  const { supabase, user } = await requireMarketplaceUser(returnTo);

  let listing: ReviewListing | null = null;
  let otherParty: ReviewParty | null = null;
  let existingRating: number | null = null;
  let currentTransactionId: string | null = null;

  if (transactionId && UUID_PATTERN.test(transactionId)) {
    const { data: transaction, error: transactionError } = await supabase
      .from('listing_transactions')
      .select(`
        id,
        listing_id,
        seller_id,
        buyer_id,
        listing:listings!listing_transactions_listing_id_fkey(id, title),
        seller:profiles!listing_transactions_seller_id_fkey(id, name),
        buyer:profiles!listing_transactions_buyer_id_fkey(id, name)
      `)
      .eq('id', transactionId)
      .maybeSingle();

    if (transactionError) throw new Error(`Could not load this sale: ${transactionError.message}`);

    if (transaction && (transaction.seller_id === user.id || transaction.buyer_id === user.id)) {
      listing = firstRelation(transaction.listing);
      otherParty = firstRelation(
        transaction.seller_id === user.id ? transaction.buyer : transaction.seller,
      );
      currentTransactionId = transaction.id;

      const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('transaction_id', transaction.id)
        .eq('reviewer_id', user.id)
        .maybeSingle();

      if (reviewError) throw new Error(`Could not check your existing rating: ${reviewError.message}`);
      existingRating = review?.rating ?? null;
    }
  } else if (listingId && UUID_PATTERN.test(listingId)) {
    const { data, error: listingError } = await supabase
      .from('listings')
      .select('id, title, seller_id, buyer_id, sold_transaction_id, seller:profiles!listings_seller_id_fkey(id, name), buyer:profiles!listings_buyer_id_fkey(id, name)')
      .eq('id', listingId)
      .eq('status', 'sold')
      .maybeSingle();

    if (listingError) throw new Error(`Could not load this sale: ${listingError.message}`);

    if (data && (data.seller_id === user.id || data.buyer_id === user.id)) {
      if (data.sold_transaction_id) {
        redirect(`/reviews/new?transactionId=${encodeURIComponent(data.sold_transaction_id)}`);
      }
      listing = { id: data.id, title: data.title };
      otherParty = firstRelation(data.seller_id === user.id ? data.buyer : data.seller);
      const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('listing_id', data.id)
        .eq('reviewer_id', user.id)
        .maybeSingle();

      if (reviewError) throw new Error(`Could not check your existing rating: ${reviewError.message}`);
      existingRating = review?.rating ?? null;
    }
  }

  return (
    <LeaveReviewForm
      userId={user.id}
      listing={listing}
      otherParty={otherParty}
      transactionId={currentTransactionId}
      existingRating={existingRating}
      inModal={inModal}
    />
  );
}
