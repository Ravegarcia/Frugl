import ReviewContent from '@/app/reviews/new/ReviewContent';
import ReviewModal from '@/components/ReviewModal';

export default function ReviewModalPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string; transactionId?: string }>;
}) {
  return (
    <ReviewModal>
      <ReviewContent searchParams={searchParams} inModal />
    </ReviewModal>
  );
}
