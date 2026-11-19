import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { createAdminClient } from '../src/lib/supabase/admin';
import {
  getSafeLocationQuery,
  hasLagunaGazetteerLocation,
  normalizeLocationKey,
} from '../src/lib/admin/location-aggregates';
import { isValidLocationCoordinates } from '../src/lib/location-validation';

type LocationRecord = {
  location?: string | null;
  default_location?: string | null;
  location_label?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
};

type Candidate = {
  labelKey: string;
  queryLabel: string;
};

const PAGE_SIZE = 500;
const REQUEST_INTERVAL_MS = 1000;
const PHILIPPINES_BOUNDS = { west: 116, south: 4, east: 128, north: 22 };
const PLACE_VALUES = new Set([
  'city',
  'municipality',
  'town',
  'village',
  'suburb',
  'quarter',
  'neighbourhood',
  'locality',
  'district',
  'state',
  'province',
  'county',
  'region',
  'administrative',
  'hamlet',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function loadProfiles(client: ReturnType<typeof createAdminClient>) {
  const rows: LocationRecord[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('profiles')
      .select('default_location, location_label, location_lat, location_lng')
      .eq('status', 'active')
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Could not load active profile locations: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function loadListings(client: ReturnType<typeof createAdminClient>) {
  const rows: LocationRecord[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('listings')
      .select('location, location_label, location_lat, location_lng')
      .eq('is_visible', true)
      .in('status', ['available', 'reserved'])
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Could not load active listing locations: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function loadCachedKeys(client: ReturnType<typeof createAdminClient>) {
  const keys = new Set<string>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('location_geocodes')
      .select('label_key')
      .order('label_key')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Could not load cached location labels: ${error.message}`);
    for (const row of data ?? []) keys.add(row.label_key);
    if (!data || data.length < PAGE_SIZE) return keys;
  }
}

function collectCandidates(records: readonly LocationRecord[], cachedKeys: ReadonlySet<string>) {
  const candidates = new Map<string, Candidate>();
  for (const record of records) {
    if (
      typeof record.location_lat === 'number' &&
      typeof record.location_lng === 'number' &&
      isValidLocationCoordinates(record.location_lat, record.location_lng)
    ) {
      continue;
    }

    const label = text(record.location_label) || text(record.location) || text(record.default_location);
    if (!label) continue;

    const labelKey = normalizeLocationKey(label);
    if (!labelKey || cachedKeys.has(labelKey) || hasLagunaGazetteerLocation(label)) continue;

    const queryLabel = getSafeLocationQuery(label);
    if (!queryLabel) continue;
    candidates.set(labelKey, { labelKey, queryLabel });
  }
  return [...candidates.values()].sort((first, second) => first.labelKey.localeCompare(second.labelKey));
}

function matchesRequestedArea(queryLabel: string, properties: Record<string, unknown>): boolean {
  const [requestedName, requestedRegion] = queryLabel.split(',').map(normalizeLocationKey);
  const returnedName = typeof properties.name === 'string'
    ? normalizeLocationKey(properties.name)
    : '';
  const nameMatches =
    returnedName === requestedName ||
    returnedName.startsWith(`${requestedName} `) ||
    requestedName.startsWith(`${returnedName} `);
  if (!nameMatches || !requestedRegion) return nameMatches;

  const returnedRegions = [
    properties.state,
    properties.county,
    properties.province,
    properties.region,
    properties.city,
    properties.town,
    properties.locality,
  ]
    .filter((value): value is string => typeof value === 'string')
    .map(normalizeLocationKey);
  return returnedRegions.some(
    (region) => region === requestedRegion || region.startsWith(`${requestedRegion} `) || requestedRegion.startsWith(`${region} `),
  );
}

async function geocodeWithPhoton(queryLabel: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', `${queryLabel}, Philippines`);
  url.searchParams.set(
    'bbox',
    `${PHILIPPINES_BOUNDS.west},${PHILIPPINES_BOUNDS.south},${PHILIPPINES_BOUNDS.east},${PHILIPPINES_BOUNDS.north}`,
  );
  url.searchParams.set('limit', '5');
  url.searchParams.set('lang', 'en');
  url.searchParams.append('layer', 'city');
  url.searchParams.append('layer', 'locality');
  url.searchParams.append('layer', 'district');
  url.searchParams.append('layer', 'county');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'FruglMarketplace/1.0 (location coordinate backfill)',
    },
  });
  if (!response.ok) throw new Error(`Photon returned HTTP ${response.status}.`);

  const payload: unknown = await response.json();
  if (!isRecord(payload) || !Array.isArray(payload.features)) return null;

  for (const feature of payload.features) {
    if (!isRecord(feature) || !isRecord(feature.properties) || !isRecord(feature.geometry)) continue;
    const properties = feature.properties;
    if (
      typeof properties.osm_value !== 'string' ||
      !PLACE_VALUES.has(properties.osm_value.toLowerCase())
    ) {
      continue;
    }
    const isPhilippines =
      properties.countrycode === 'PH' ||
      properties.country_code === 'PH' ||
      properties.country === 'Philippines';
    const coordinates = feature.geometry.coordinates;
    if (
      !isPhilippines ||
      !matchesRequestedArea(queryLabel, properties) ||
      !Array.isArray(coordinates) ||
      typeof coordinates[0] !== 'number' ||
      typeof coordinates[1] !== 'number' ||
      !Number.isFinite(coordinates[0]) ||
      !Number.isFinite(coordinates[1]) ||
      coordinates[0] < PHILIPPINES_BOUNDS.west ||
      coordinates[0] > PHILIPPINES_BOUNDS.east ||
      coordinates[1] < PHILIPPINES_BOUNDS.south ||
      coordinates[1] > PHILIPPINES_BOUNDS.north
    ) {
      continue;
    }
    return { lat: coordinates[1], lng: coordinates[0] };
  }
  return null;
}

async function main() {
  if (existsSync('.env.local')) loadEnvFile('.env.local');

  const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
  if (process.argv.includes('--dry-run') && process.argv.includes('--apply')) {
    throw new Error('Choose either --dry-run or --apply, not both.');
  }

  const client = createAdminClient();
  const [profiles, listings, cachedKeys] = await Promise.all([
    loadProfiles(client),
    loadListings(client),
    loadCachedKeys(client),
  ]);
  const candidates = collectCandidates([...profiles, ...listings], cachedKeys);

  console.log(`Found ${candidates.length} distinct safe location labels to geocode.`);
  for (const candidate of candidates) console.log(`- ${candidate.queryLabel}`);

  if (isDryRun) {
    console.log('Dry run only: no Photon requests or database writes were made.');
    return;
  }

  let lastRequestAt = 0;
  let saved = 0;
  let unmatched = 0;
  for (const candidate of candidates) {
    const delay = Math.max(0, REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    lastRequestAt = Date.now();

    const coordinates = await geocodeWithPhoton(candidate.queryLabel);
    if (!coordinates) {
      unmatched += 1;
      console.warn(`No verified Philippines result for "${candidate.queryLabel}".`);
      continue;
    }

    const { error } = await client.from('location_geocodes').upsert(
      {
        label_key: candidate.labelKey,
        label: candidate.queryLabel,
        lat: coordinates.lat,
        lng: coordinates.lng,
        source: 'photon',
        resolved_at: new Date().toISOString(),
      },
      { onConflict: 'label_key' },
    );
    if (error) throw new Error(`Could not cache "${candidate.queryLabel}": ${error.message}`);
    saved += 1;
    console.log(`Cached "${candidate.queryLabel}" (${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}).`);
  }

  console.log(`Backfill complete: ${saved} cached, ${unmatched} unmatched.`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Location geocode backfill failed.');
  process.exitCode = 1;
});
