import { requireMarketplaceUser } from '@/lib/auth';
import { CARD_SELECT } from '@/lib/queries';
import ListingCard from '@/components/ListingCard';
import EmptyState from '@/components/EmptyState';
import Stagger from '@/components/motion/Stagger';
import StaggerItem from '@/components/motion/StaggerItem';

export default async function SavedPage() {
  const { supabase, user } = await requireMarketplaceUser('/saved');

  const { data: savedListings, error: savedListingsError } = await supabase
    .from('saved_listings')
    .select('listing_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (savedListingsError) throw new Error('Could not load saved listings: ' + savedListingsError.message);
  const savedIds = (savedListings ?? []).map((saved) => saved.listing_id);
  let items: any[] = [];
  if (savedIds.length > 0) {
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select(CARD_SELECT)
      .in('id', savedIds);
    if (listingsError) throw new Error('Could not load saved listing details: ' + listingsError.message);
    const listingsById = new Map((listings ?? []).map((listing) => [listing.id, listing]));
    items = savedIds.map((id) => listingsById.get(id)).filter(Boolean);
  }

  return (
    <div className='utility-page'>
      <header className='utility-page-heading'>
        <h1 className='text-2xl font-bold text-gray-900'>Saved items</h1>
        <p className='text-sm text-gray-500'>Laptops you have favorited to follow or compare.</p>
      </header>

      {items.length > 0 ? (
        <Stagger className='grid grid-cols-2 gap-4 md:grid-cols-4'>
          {items.map((l: any, index) => (
            <StaggerItem
              key={l.id}
              index={index}
              initiallyVisible={index < 4}
              layout
            >
              <ListingCard listing={l} initialSaved />
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <EmptyState
          title='No saved laptops'
          hint='Click the Save button on any laptop listing to keep track of it here.'
          href='/laptops'
          action='Browse laptops'
        />
      )}
    </div>
  );
}
