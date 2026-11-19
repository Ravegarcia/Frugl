import { requireMarketplaceUser } from '@/lib/auth';
import AccountForm from './AccountForm';

export default async function AccountPage() {
  const { supabase, user, profile } = await requireMarketplaceUser('/account');
  const providers = new Set<string>([
    ...(Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : []),
    ...(user.identities ?? []).map((identity) => identity.provider),
  ]);
  const requiresPasswordForDeletion = providers.size === 0 || providers.has('email');

  const { data: privateData, error: privateError } = await supabase
    .from('profile_private')
    .select('contact_number')
    .eq('id', user.id)
    .maybeSingle();
  if (privateError) {
    throw new Error(`Could not load private contact details: ${privateError.message}`);
  }

  return (
    <AccountForm
      user={user}
      profile={profile}
      contactNumber={privateData?.contact_number || ''}
      requiresPasswordForDeletion={requiresPasswordForDeletion}
    />
  );
}
