import { requireMarketplaceUser } from '@/lib/auth';
import { CARD_SELECT } from '@/lib/queries';
import ListingCard from '@/components/ListingCard';
import EmptyState from '@/components/EmptyState';

export default async function SavedPage() {
  const { supabase, user } = await requireMarketplaceUser('/saved');

  const { data: savedListings } = await supabase
    .from('saved_listings')
    .select(`
      created_at,
      listings (${CARD_SELECT})
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const items = (savedListings || []).map((s: any) => s.listings).filter(Boolean);

  return (
    <div className='utility-page'>
      <header className='utility-page-heading'>
        <h1 className='text-2xl font-bold text-gray-900'>Saved items</h1>
        <p className='text-sm text-gray-500'>Laptops you have favorited to follow or compare.</p>
      </header>

      {items.length > 0 ? (
        <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
          {items.map((l: any) => (
            <ListingCard key={l.id} listing={l} initialSaved />
          ))}
        </div>
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
