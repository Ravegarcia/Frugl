'use client';

import { useEffect, useRef } from 'react';
import {
  divIcon,
  layerGroup,
  map as createMap,
  marker,
  tileLayer,
} from 'leaflet';
import type { LayerGroup } from 'leaflet';
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

export default function LagunaMemberMap({ locations }: { locations: LagunaSellerLocation[] }) {
  const mapElement = useRef<HTMLDivElement>(null);
  const markersRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    const element = mapElement.current;
    if (!element) return;

    const map = createMap(element, {
      center: lagunaCenter,
      zoom: 9,
      minZoom: 8,
      maxZoom: 13,
      maxBounds: lagunaBounds,
      maxBoundsViscosity: 1,
      attributionControl: false,
      scrollWheelZoom: false,
    });
    const markers = layerGroup().addTo(map);
    tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    markersRef.current = markers;

    return () => {
      markersRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const markers = markersRef.current;
    if (!markers) return;

    markers.clearLayers();
    for (const location of locations) {
      const popup = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = location.name;
      const count = document.createElement('div');
      count.textContent = `${location.sellerCount.toLocaleString()} ${
        location.sellerCount === 1 ? 'seller' : 'sellers'
      }`;
      popup.append(name, count);

      marker(location.coordinates, { icon: locationPinIcon })
        .bindPopup(popup)
        .addTo(markers);
    }
  }, [locations]);

  return (
    <div
      ref={mapElement}
      className='admin-laguna-leaflet-map'
      role='application'
      aria-label='Map of sellers across Laguna'
    />
  );
}
