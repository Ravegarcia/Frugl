import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import EditDraftForm from './EditDraftForm';

export default async function SellDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await requireUser(`/sell/${id}`);

  // Fetch listing, photos, and any condition reports
  const { data: listing } = await supabase
    .from('listings')
    .select('*, listing_photos(*), condition_reports(*), identification_results(*)')
    .eq('id', id)
    .maybeSingle();

  if (!listing) notFound();

  // If user is not the seller and not staff, deny access
  if (listing.seller_id !== user.id && profile?.role !== 'admin' && profile?.role !== 'moderator') {
    redirect('/');
  }

  // Fetch candidate laptop models to allow switching/correcting
  const { data: catalogModels } = await supabase
    .from('laptop_models')
    .select('*')
    .order('brand');

  return (
    <div className='py-4'>
      <EditDraftForm
        initialListing={listing}
        catalogModels={catalogModels || []}
        userLocation={profile?.default_location || ''}
      />
    </div>
  );
}
