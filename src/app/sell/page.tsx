import { requireMarketplaceUser } from '@/lib/auth';
import SellForm from './SellForm';

export default async function SellPage() {
  const { profile } = await requireMarketplaceUser('/sell');
  return (
    <SellForm
      sellerName={profile?.name ?? 'Your profile'}
      location={profile?.default_location ?? ''}
    />
  );
}
