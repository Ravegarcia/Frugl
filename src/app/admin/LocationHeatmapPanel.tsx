'use client';

import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import type { AdminMemberLocations } from '@/lib/admin/member-locations';
import { formatPrivacyCount, formatPrivacyCountLabel } from '@/lib/format';

type Audience = keyof Pick<AdminMemberLocations, 'all' | 'sellers' | 'buyers'>;

const AUDIENCES: Audience[] = ['all', 'sellers', 'buyers'];
const PHILIPPINES_CENTER: L.LatLngExpression = [12.8797, 121.774];

function getAreaLabel(name: string, province: string | null): string {
  return province ? `${name}, ${province}` : name;
}

function getAreaKey(name: string, province: string | null): string {
  return `${name}|${province || ''}`;
}

export default function LocationHeatmapPanel({ data }: { data: AdminMemberLocations }) {
  const [audience, setAudience] = useState<Audience>('all');
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const current = data[audience];

  useEffect(() => {
    if (!mapElement.current) return;

    const map = L.map(mapElement.current, {
      center: PHILIPPINES_CENTER,
      zoom: 5,
      minZoom: 4,
      maxZoom: 12,
      scrollWheelZoom: false,
      keyboard: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map);
    const markerLayer = L.layerGroup().addTo(map);
    const markers = markersRef.current;
    mapRef.current = map;
    markerLayerRef.current = markerLayer;
    map.whenReady(() => map.invalidateSize());

    return () => {
      markers.clear();
      markerLayerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();
    markersRef.current.clear();
    for (const area of current.areas) {
      const label = getAreaLabel(area.name, area.province);
      const marker = L.circleMarker([area.lat, area.lng], {
        radius: Math.min(20, 6 + Math.sqrt(area.count) * 2),
        color: '#ffffff',
        weight: 1.5,
        fillColor: '#684080',
        fillOpacity: 0.82,
      });
      const tooltip = document.createElement('span');
      tooltip.textContent = `${label}: ${formatPrivacyCountLabel(area.count, 'member')}`;
      marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -8] });
      marker.on('click', () => {
        map.setView(marker.getLatLng(), Math.max(map.getZoom(), 8));
        marker.openTooltip();
      });
      marker.addTo(markerLayer);
      markersRef.current.set(getAreaKey(area.name, area.province), marker);
    }

    if (current.areas.length > 0) {
      const bounds = L.latLngBounds(current.areas.map((area) => L.latLng(area.lat, area.lng)));
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 7 });
    } else {
      map.setView(PHILIPPINES_CENTER, 5);
    }
  }, [current]);

  function focusArea(name: string, province: string | null) {
    const marker = markersRef.current.get(getAreaKey(name, province));
    if (!marker || !mapRef.current) return;
    mapRef.current.setView(marker.getLatLng(), Math.max(mapRef.current.getZoom(), 8));
    marker.openTooltip();
  }

  const topAreas = current.areas.slice(0, 6);

  return (
    <div className='admin-heatmap-panel'>
      <div className='admin-heatmap-header'>
        {data.migrationWarning && (
          <p className='admin-heatmap-migration-warning' role='status'>
            Location coordinates are not set up in the database yet. This map is using legacy location data; apply
            {' '}<code>supabase/14_location_coordinates.sql</code> to enable saved coordinates and cached geocoding.
          </p>
        )}
        <div className='admin-heatmap-toolbar'>
          <div className='admin-heatmap-switch' role='group' aria-label='Choose location map audience'>
            {AUDIENCES.map((option) => (
              <button
                type='button'
                key={option}
                aria-pressed={audience === option}
                className={audience === option ? 'is-active' : ''}
                onClick={() => setAudience(option)}
              >
                {option === 'all' ? 'All' : option === 'sellers' ? 'Sellers' : 'Buyers'}
              </button>
            ))}
          </div>
          <div className='admin-heatmap-summary' aria-live='polite'>
            <strong>{formatPrivacyCount(current.totalPeople)}</strong>
            <span>eligible members</span>
          </div>
        </div>
      </div>

      <div className='admin-heatmap-content'>
        <div className='admin-heatmap-map-shell'>
          <div
            ref={mapElement}
            className='admin-heatmap-map'
            role='region'
            aria-label={`Interactive map of approximate ${audience} locations`}
          />
          {current.areas.length === 0 && (
            <p className='admin-heatmap-map-empty' role='status'>
              No location areas meet the minimum group size yet.
            </p>
          )}
        </div>

        <aside className='admin-heatmap-breakdown' aria-label={`Top ${audience} locations`}>
          <div className='admin-heatmap-breakdown-heading'>
            <strong>Top locations</strong>
            <span>{current.areas.length} shown</span>
          </div>
          {topAreas.length > 0 ? (
            <ol className='admin-heatmap-location-list'>
              {topAreas.map((area) => (
                <li key={getAreaKey(area.name, area.province)}>
                  <button
                    type='button'
                    className='admin-heatmap-location-button'
                    onClick={() => focusArea(area.name, area.province)}
                    aria-label={`Zoom to ${getAreaLabel(area.name, area.province)}, ${formatPrivacyCountLabel(area.count, 'member')}`}
                  >
                    <span className='admin-heatmap-location-copy'>
                      <strong>{getAreaLabel(area.name, area.province)}</strong>
                      <span>{formatPrivacyCountLabel(area.count, 'member')}</span>
                    </span>
                    <span className='admin-heatmap-location-track' aria-hidden='true'>
                      <span style={{ width: `${(area.count / topAreas[0].count) * 100}%` }} />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className='admin-heatmap-empty'>
              Eligible locations will appear here after enough members share an area.
            </p>
          )}
          {current.suppressedPeople > 0 && (
            <p className='admin-heatmap-privacy-note'>
              {formatPrivacyCount(current.suppressedPeople)} members in small groups are hidden.
            </p>
          )}
        </aside>
      </div>

      <div className='admin-heatmap-footer'>
        <details className='admin-heatmap-unmapped'>
          <summary>
            Unmapped locations · {formatPrivacyCountLabel(current.unmappedPeople, 'member')}
          </summary>
          {current.unmapped.length > 0 ? (
            <ul>
              {current.unmapped.map((area) => (
                <li key={area.name}>
                  <span>{area.name}</span>
                  <span>{formatPrivacyCountLabel(area.count, 'member')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>Unmapped area names are not available at a privacy-safe group size.</p>
          )}
        </details>

        <p className='admin-heatmap-privacy'>
          Approximate city-level aggregates only. Individual accounts and exact addresses are never shown.
        </p>
      </div>
    </div>
  );
}
