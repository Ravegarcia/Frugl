import ReviewContent from './ReviewContent';

export default function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string; transactionId?: string }>;
}) {
  return (
    <div className='py-4'>
      <ReviewContent searchParams={searchParams} />
    </div>
  );
}
