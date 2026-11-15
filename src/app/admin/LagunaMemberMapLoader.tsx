'use client';

import dynamic from 'next/dynamic';
import type { LagunaSellerLocation } from '@/lib/admin/laguna-locations';

const LagunaMemberMap = dynamic(() => import('./LagunaMemberMap'), {
  ssr: false,
  loading: () => <div className='admin-laguna-map-loading'>Loading Laguna map...</div>,
});

export default function LagunaMemberMapLoader({
  locations,
}: {
  locations: LagunaSellerLocation[];
}) {
  return <LagunaMemberMap locations={locations} />;
}
