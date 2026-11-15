'use client';

import { useEffect } from 'react';
import { divIcon } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { LagunaSellerLocation } from '@/lib/admin/laguna-locations';

const lagunaCenter: [number, number] = [14.2, 121.35];
const lagunaBounds: [[number, number], [number, number]] = [
  [13.94, 120.96],
  [14.58, 121.69],
];
const locationPinIcon = divIcon({
  className: '',
  html: '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="35" viewBox="0 0 48 64" aria-hidden="true"><path fill="#e32636" d="M24 1C11.3 1 1 11.3 1 24c0 17 23 39 23 39s23-22 23-39C47 11.3 36.7 1 24 1Z"/><circle cx="24" cy="23" r="8" fill="#fff"/></svg>',
  iconSize: [26, 35],
  iconAnchor: [13, 35],
  popupAnchor: [0, -32],
});

function RemoveDefaultAttribution() {
  const map = useMap();

  useEffect(() => {
    map.attributionControl?.remove();
  }, [map]);

  return null;
}

export default function LagunaMemberMap({ locations }: { locations: LagunaSellerLocation[] }) {
  return (
    <MapContainer
      center={lagunaCenter}
      zoom={9}
      minZoom={8}
      maxZoom={13}
      maxBounds={lagunaBounds}
      maxBoundsViscosity={1}
      attributionControl={false}
      scrollWheelZoom={false}
      className='admin-laguna-leaflet-map'
    >
      <RemoveDefaultAttribution />
      <TileLayer
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      {locations.map((location) => (
        <Marker
          key={location.name}
          position={location.coordinates}
          icon={locationPinIcon}
        >
          <Popup>
            <strong>{location.name}</strong>
            <br />
            {location.sellerCount.toLocaleString()}{' '}
            {location.sellerCount === 1 ? 'seller' : 'sellers'}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
