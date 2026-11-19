'use client';

import dynamic from 'next/dynamic';
import type { AdminMemberLocations } from '@/lib/admin/member-locations';

const LocationHeatmapPanel = dynamic(() => import('./LocationHeatmapPanel'), {
  ssr: false,
  loading: () => <div className='admin-heatmap-map-loading'>Loading location map…</div>,
});

export default function LocationHeatmapPanelLoader({ data }: { data: AdminMemberLocations }) {
  return <LocationHeatmapPanel data={data} />;
}
