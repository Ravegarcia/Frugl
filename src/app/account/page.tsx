import { requireMarketplaceUser } from '@/lib/auth';
import AccountForm from './AccountForm';

export default async function AccountPage() {
  const { supabase, user, profile } = await requireMarketplaceUser('/account');

  // Fetch private contact number
  const { data: privateData } = await supabase
    .from('profile_private')
    .select('contact_number')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <div className='py-4'>
      <AccountForm
        user={user}
        profile={profile}
        contactNumber={privateData?.contact_number || ''}
      />
    </div>
  );
}
