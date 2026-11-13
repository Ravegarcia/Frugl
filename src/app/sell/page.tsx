import { requireMarketplaceUser } from '@/lib/auth';
import SellForm from './SellForm';

export default async function SellPage() {
  await requireMarketplaceUser('/sell');
  return <SellForm />;
}
