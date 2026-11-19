import { NextRequest, NextResponse } from 'next/server';
import { sanitizeLocationSearchQuery } from '@/lib/location-validation';

export interface LocationSuggestion {
  id: string;
  primary: string;
  secondary: string;
  value: string;
  lat: number | null;
  lng: number | null;
}

type CuratedLocation = Omit<LocationSuggestion, 'lat' | 'lng'>;

// Curated fast-path locations (Philippine cities/municipalities)
// Provides instant zero-latency matches and fallback if external OSM endpoints are slow or offline.
const CURATED_LOCATION_DEFINITIONS: CuratedLocation[] = [
  { id: 'ph-qc', primary: 'Quezon City', secondary: 'City · Metro Manila, Philippines', value: 'Quezon City, Metro Manila' },
  { id: 'ph-manila', primary: 'Manila', secondary: 'City · Metro Manila, Philippines', value: 'Manila, Metro Manila' },
  { id: 'ph-makati', primary: 'Makati City', secondary: 'City · Metro Manila, Philippines', value: 'Makati City, Metro Manila' },
  { id: 'ph-taguig', primary: 'Taguig City', secondary: 'City · Metro Manila, Philippines', value: 'Taguig City, Metro Manila' },
  { id: 'ph-bgc', primary: 'Bonifacio Global City', secondary: 'District · Taguig, Metro Manila, Philippines', value: 'Bonifacio Global City, Taguig' },
  { id: 'ph-pasig', primary: 'Pasig City', secondary: 'City · Metro Manila, Philippines', value: 'Pasig City, Metro Manila' },
  { id: 'ph-mandaluyong', primary: 'Mandaluyong City', secondary: 'City · Metro Manila, Philippines', value: 'Mandaluyong City, Metro Manila' },
  { id: 'ph-paranaque', primary: 'Parañaque City', secondary: 'City · Metro Manila, Philippines', value: 'Parañaque City, Metro Manila' },
  { id: 'ph-pasay', primary: 'Pasay City', secondary: 'City · Metro Manila, Philippines', value: 'Pasay City, Metro Manila' },
  { id: 'ph-marikina', primary: 'Marikina City', secondary: 'City · Metro Manila, Philippines', value: 'Marikina City, Metro Manila' },
  { id: 'ph-muntinlupa', primary: 'Muntinlupa City', secondary: 'City · Metro Manila, Philippines', value: 'Muntinlupa City, Metro Manila' },
  { id: 'ph-las-pinas', primary: 'Las Piñas City', secondary: 'City · Metro Manila, Philippines', value: 'Las Piñas City, Metro Manila' },
  { id: 'ph-caloocan', primary: 'Caloocan City', secondary: 'City · Metro Manila, Philippines', value: 'Caloocan City, Metro Manila' },
  { id: 'ph-valenzuela', primary: 'Valenzuela City', secondary: 'City · Metro Manila, Philippines', value: 'Valenzuela City, Metro Manila' },
  { id: 'ph-san-juan', primary: 'San Juan City', secondary: 'City · Metro Manila, Philippines', value: 'San Juan City, Metro Manila' },
  { id: 'ph-malabon', primary: 'Malabon City', secondary: 'City · Metro Manila, Philippines', value: 'Malabon City, Metro Manila' },
  { id: 'ph-navotas', primary: 'Navotas City', secondary: 'City · Metro Manila, Philippines', value: 'Navotas City, Metro Manila' },
  { id: 'ph-san-pablo', primary: 'San Pablo City', secondary: 'City · Laguna, Philippines', value: 'San Pablo City, Laguna' },
  { id: 'ph-santa-rosa', primary: 'Santa Rosa City', secondary: 'City · Laguna, Philippines', value: 'Santa Rosa City, Laguna' },
  { id: 'ph-calamba', primary: 'Calamba City', secondary: 'City · Laguna, Philippines', value: 'Calamba City, Laguna' },
  { id: 'ph-binan', primary: 'Biñan City', secondary: 'City · Laguna, Philippines', value: 'Biñan City, Laguna' },
  { id: 'ph-cabuyao', primary: 'Cabuyao City', secondary: 'City · Laguna, Philippines', value: 'Cabuyao City, Laguna' },
  { id: 'ph-san-pedro', primary: 'San Pedro City', secondary: 'City · Laguna, Philippines', value: 'San Pedro City, Laguna' },
  { id: 'ph-los-banos', primary: 'Los Baños', secondary: 'Municipality · Laguna, Philippines', value: 'Los Baños, Laguna' },
  { id: 'ph-antipolo', primary: 'Antipolo City', secondary: 'City · Rizal, Philippines', value: 'Antipolo City, Rizal' },
  { id: 'ph-cainta', primary: 'Cainta', secondary: 'Municipality · Rizal, Philippines', value: 'Cainta, Rizal' },
  { id: 'ph-taytay', primary: 'Taytay', secondary: 'Municipality · Rizal, Philippines', value: 'Taytay, Rizal' },
  { id: 'ph-bacoor', primary: 'Bacoor City', secondary: 'City · Cavite, Philippines', value: 'Bacoor City, Cavite' },
  { id: 'ph-imus', primary: 'Imus City', secondary: 'City · Cavite, Philippines', value: 'Imus City, Cavite' },
  { id: 'ph-dasmarinas', primary: 'Dasmariñas City', secondary: 'City · Cavite, Philippines', value: 'Dasmariñas City, Cavite' },
  { id: 'ph-tagaytay', primary: 'Tagaytay City', secondary: 'City · Cavite, Philippines', value: 'Tagaytay City, Cavite' },
  { id: 'ph-general-trias', primary: 'General Trias City', secondary: 'City · Cavite, Philippines', value: 'General Trias City, Cavite' },
  { id: 'ph-malolos', primary: 'Malolos City', secondary: 'City · Bulacan, Philippines', value: 'Malolos City, Bulacan' },
  { id: 'ph-meycauayan', primary: 'Meycauayan City', secondary: 'City · Bulacan, Philippines', value: 'Meycauayan City, Bulacan' },
  { id: 'ph-sjdm', primary: 'San Jose del Monte City', secondary: 'City · Bulacan, Philippines', value: 'San Jose del Monte City, Bulacan' },
  { id: 'ph-angeles', primary: 'Angeles City', secondary: 'City · Pampanga, Philippines', value: 'Angeles City, Pampanga' },
  { id: 'ph-san-fernando-pam', primary: 'San Fernando City', secondary: 'City · Pampanga, Philippines', value: 'San Fernando City, Pampanga' },
  { id: 'ph-san-fernando-lu', primary: 'San Fernando City', secondary: 'City · La Union, Philippines', value: 'San Fernando City, La Union' },
  { id: 'ph-baguio', primary: 'Baguio City', secondary: 'City · Benguet, Philippines', value: 'Baguio City, Benguet' },
  { id: 'ph-lipa', primary: 'Lipa City', secondary: 'City · Batangas, Philippines', value: 'Lipa City, Batangas' },
  { id: 'ph-batangas', primary: 'Batangas City', secondary: 'City · Batangas, Philippines', value: 'Batangas City, Batangas' },
  { id: 'ph-lucena', primary: 'Lucena City', secondary: 'City · Quezon, Philippines', value: 'Lucena City, Quezon' },
  { id: 'ph-naga', primary: 'Naga City', secondary: 'City · Camarines Sur, Philippines', value: 'Naga City, Camarines Sur' },
  { id: 'ph-legazpi', primary: 'Legazpi City', secondary: 'City · Albay, Philippines', value: 'Legazpi City, Albay' },
  { id: 'ph-cebu', primary: 'Cebu City', secondary: 'City · Cebu, Philippines', value: 'Cebu City, Cebu' },
  { id: 'ph-mandaue', primary: 'Mandaue City', secondary: 'City · Cebu, Philippines', value: 'Mandaue City, Cebu' },
  { id: 'ph-lapu-lapu', primary: 'Lapu-Lapu City', secondary: 'City · Cebu, Philippines', value: 'Lapu-Lapu City, Cebu' },
  { id: 'ph-iloilo', primary: 'Iloilo City', secondary: 'City · Iloilo, Philippines', value: 'Iloilo City, Iloilo' },
  { id: 'ph-bacolod', primary: 'Bacolod City', secondary: 'City · Negros Occidental, Philippines', value: 'Bacolod City, Negros Occidental' },
  { id: 'ph-dumaguete', primary: 'Dumaguete City', secondary: 'City · Negros Oriental, Philippines', value: 'Dumaguete City, Negros Oriental' },
  { id: 'ph-tacloban', primary: 'Tacloban City', secondary: 'City · Leyte, Philippines', value: 'Tacloban City, Leyte' },
  { id: 'ph-davao', primary: 'Davao City', secondary: 'City · Davao del Sur, Philippines', value: 'Davao City, Davao del Sur' },
  { id: 'ph-cdo', primary: 'Cagayan de Oro City', secondary: 'City · Misamis Oriental, Philippines', value: 'Cagayan de Oro City, Misamis Oriental' },
  { id: 'ph-gensan', primary: 'General Santos City', secondary: 'City · South Cotabato, Philippines', value: 'General Santos City, South Cotabato' },
  { id: 'ph-zamboanga', primary: 'Zamboanga City', secondary: 'City · Zamboanga del Sur, Philippines', value: 'Zamboanga City, Zamboanga del Sur' },
  { id: 'ph-butuan', primary: 'Butuan City', secondary: 'City · Agusan del Norte, Philippines', value: 'Butuan City, Agusan del Norte' },
  { id: 'ph-iligan', primary: 'Iligan City', secondary: 'City · Lanao del Norte, Philippines', value: 'Iligan City, Lanao del Norte' },
];

const CURATED_COORDINATES: Record<string, readonly [number, number]> = {
  'ph-qc': [14.65105, 121.04863],
  'ph-manila': [14.59045, 120.98036],
  'ph-makati': [14.55679, 121.02112],
  'ph-taguig': [14.52705, 121.07449],
  'ph-bgc': [14.55081, 121.05097],
  'ph-pasig': [14.56052, 121.07643],
  'ph-paranaque': [14.50081, 120.99153],
  'ph-pasay': [14.5437, 120.99465],
  'ph-marikina': [14.63311, 121.09935],
  'ph-muntinlupa': [14.38926, 121.04491],
  'ph-caloocan': [14.65129, 120.97219],
  'ph-valenzuela': [14.6915, 120.96994],
  'ph-san-juan': [14.60444, 121.02995],
  'ph-malabon': [14.65785, 120.95113],
  'ph-navotas': [14.65719, 120.94797],
  'ph-san-pablo': [14.07, 121.325],
  'ph-santa-rosa': [14.31, 121.11],
  'ph-calamba': [14.211, 121.165],
  'ph-binan': [14.341, 121.08],
  'ph-cabuyao': [14.272, 121.125],
  'ph-san-pedro': [14.36, 121.06],
  'ph-los-banos': [14.17, 121.242],
  'ph-antipolo': [14.5872, 121.17592],
  'ph-cainta': [14.57802, 121.11631],
  'ph-taytay': [14.57047, 121.13195],
  'ph-sjdm': [14.8102, 121.04741],
  'ph-baguio': [16.41199, 120.59339],
  'ph-batangas': [13.75523, 121.05913],
  'ph-naga': [13.62401, 123.18503],
  'ph-cebu': [10.29349, 123.90182],
  'ph-iloilo': [10.69265, 122.57368],
  'ph-tacloban': [11.24316, 125.00829],
  'ph-davao': [7.06483, 125.60806],
};

// Unmatched or ambiguous geocoder results stay nullable rather than storing a guessed point.
const CURATED_LOCATIONS: LocationSuggestion[] = CURATED_LOCATION_DEFINITIONS.map((location) => {
  const coordinates = CURATED_COORDINATES[location.id];
  return {
    ...location,
    lat: coordinates?.[0] ?? null,
    lng: coordinates?.[1] ?? null,
  };
});

function formatPlaceType(osmValue?: string, osmType?: string): string {
  const raw = (osmValue || osmType || '').toLowerCase();
  if (raw === 'city' || raw === 'municipality') return 'City';
  if (raw === 'town') return 'Town / Municipality';
  if (
    raw === 'village' ||
    raw === 'suburb' ||
    raw === 'quarter' ||
    raw === 'neighbourhood' ||
    raw === 'locality' ||
    raw === 'district'
  ) {
    return 'Barangay / District';
  }
  if (raw === 'state' || raw === 'province' || raw === 'county' || raw === 'region' || raw === 'administrative') {
    return 'Province / Region';
  }
  return 'Location';
}

function isPlaceResult(osmValue?: string): boolean {
  const placeValues = new Set([
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
  return Boolean(osmValue && placeValues.has(osmValue.toLowerCase()));
}

function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bcity\b/gi, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0);
}

function getPhilippinesCoordinates(feature: unknown): { lat: number; lng: number } | null {
  if (!isRecord(feature) || !isRecord(feature.properties) || !isRecord(feature.geometry)) return null;
  const coordinates = feature.geometry.coordinates;
  const properties = feature.properties;
  const isPhilippines =
    properties?.countrycode === 'PH' ||
    properties?.country_code === 'PH' ||
    normalize(String(properties?.country || '')) === 'philippines';
  if (
    !isPhilippines ||
    !Array.isArray(coordinates) ||
    typeof coordinates[0] !== 'number' ||
    typeof coordinates[1] !== 'number' ||
    !Number.isFinite(coordinates[0]) ||
    !Number.isFinite(coordinates[1]) ||
    coordinates[0] < 116 ||
    coordinates[0] > 128 ||
    coordinates[1] < 4 ||
    coordinates[1] > 22
  ) {
    return null;
  }
  return { lat: coordinates[1], lng: coordinates[0] };
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();

  if (!q) {
    return NextResponse.json({ suggestions: CURATED_LOCATIONS.slice(0, 8) });
  }

  const normalizedQuery = normalize(q);

  // 1. Match curated locations first
  const localMatches = CURATED_LOCATIONS.filter(
    (loc) =>
      normalize(loc.primary).includes(normalizedQuery) ||
      normalize(loc.secondary).includes(normalizedQuery) ||
      normalize(loc.value).includes(normalizedQuery)
  ).sort((a, b) => {
    const aStarts = normalize(a.primary).startsWith(normalizedQuery) ? 0 : 1;
    const bStarts = normalize(b.primary).startsWith(normalizedQuery) ? 0 : 1;
    return aStarts - bStarts;
  });

  const results: LocationSuggestion[] = [...localMatches.slice(0, 4)];
  const seenKeys = new Set(results.map((r) => normalize(r.value)));
  const externalQuery = sanitizeLocationSearchQuery(q);
  if (!externalQuery) return NextResponse.json({ suggestions: results.slice(0, 8) });

  // Photon is bounded to the Philippines and country-checked before results are returned.
  const photonUrl =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(externalQuery)}` +
    `&bbox=116,4,128,22` +
    `&layer=city&layer=locality&layer=district&layer=county&layer=state` +
    `&limit=12&lang=en`;

  const nominatimUrl =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1` +
    `&countrycodes=ph&limit=6&q=${encodeURIComponent(externalQuery)}`;

  async function fetchJson(url: string, headers: HeadersInit): Promise<unknown | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
        next: { revalidate: 3600 },
      });
      if (!response.ok) {
        console.error(`Location provider returned HTTP ${response.status}.`);
        return null;
      }
      return await response.json();
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('Could not load location suggestions:', error instanceof Error ? error.message : 'Unknown error');
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  const photonData = await fetchJson(photonUrl, {
    Accept: 'application/json',
    'User-Agent': 'FruglMarketplace/1.0 (Location Autocomplete)',
  });

  if (isRecord(photonData) && Array.isArray(photonData.features)) {
    for (const feat of photonData.features) {
    if (!isRecord(feat) || !isRecord(feat.properties)) continue;
    const props = feat.properties;
    if (typeof props.name !== 'string') continue;

    const name = props.name;
    const city = firstString(props.city, props.town, props.locality);
    const state = firstString(props.state, props.county);
    const country = firstString(props.country);
    const osmValue = firstString(props.osm_value);
    if (!isPlaceResult(osmValue)) continue;
    const placeType = formatPlaceType(
      osmValue,
      firstString(props.type),
    );

    // Include province/city in primary or secondary so same-named places in different provinces stay distinct
    const regionLabel = state || city;
    const primary =
      regionLabel && normalize(regionLabel) !== normalize(name)
        ? `${name}, ${regionLabel}`
        : name;

    const contextParts = [city, state, country].filter(
      (part): part is string =>
        Boolean(part) && normalize(part!) !== normalize(name)
    );

    const secondary =
      contextParts.length > 0 ? `${placeType} · ${contextParts.join(', ')}` : placeType;

    const selectedName = city && normalize(city) !== normalize(name) ? city : name;
    const value = [selectedName, state].filter(Boolean).join(', ');

    const coordinates = getPhilippinesCoordinates(feat);
    if (!coordinates) continue;

    const dedupeKey = normalize(`${name}|${state || ''}|${city || ''}|${country || ''}`);
    if (!seenKeys.has(dedupeKey) && !seenKeys.has(normalize(value))) {
      seenKeys.add(dedupeKey);
      seenKeys.add(normalize(value));
      const osmId = typeof props.osm_id === 'string' || typeof props.osm_id === 'number'
        ? props.osm_id
        : results.length;
      results.push({
        id: `osm-${osmId}`,
        primary,
        secondary,
        value,
        lat: coordinates.lat,
        lng: coordinates.lng,
      });
    }

    if (results.length >= 10) break;
  }
  }

  if (results.length < 8) {
    // Nominatim's usage policy discourages autocomplete; retain it only as a server-side fallback.
    const nominatimData = await fetchJson(nominatimUrl, {
      Accept: 'application/json',
      'Accept-Language': 'en',
      'User-Agent': 'FruglMarketplace/1.0 (Location Autocomplete)',
    });
    if (Array.isArray(nominatimData)) {
      for (const rawItem of nominatimData) {
        if (!isRecord(rawItem)) continue;
        const item = rawItem;
        const name =
          firstString(item.name) ||
          (typeof item.display_name === 'string' ? item.display_name.split(',')[0] : '');
        if (!name) continue;
        const addr = isRecord(item.address) ? item.address : {};
        const city = firstString(addr.city, addr.town, addr.municipality);
        const state = firstString(addr.state, addr.province, addr.region, addr.county);
        const country = firstString(addr.country) || 'Philippines';
        const itemType = firstString(item.type);
        const category = firstString(item.category);
        if (!isPlaceResult(itemType)) continue;
        const placeType = formatPlaceType(itemType, category);

        const regionLabel = state || city;
        const primary =
          regionLabel && normalize(regionLabel) !== normalize(name)
            ? `${name}, ${regionLabel}`
            : name;

        const contextParts = [city, state, country].filter(
          (part): part is string =>
            Boolean(part) && normalize(part!) !== normalize(name)
        );
        const secondary =
          contextParts.length > 0 ? `${placeType} · ${contextParts.join(', ')}` : placeType;
        const selectedName = city && normalize(city) !== normalize(name) ? city : name;
        const value = [selectedName, state].filter(Boolean).join(', ');

        const dedupeKey = normalize(`${name}|${state || ''}|${city || ''}|${country || ''}`);
        if (!seenKeys.has(dedupeKey) && !seenKeys.has(normalize(value))) {
          seenKeys.add(dedupeKey);
          seenKeys.add(normalize(value));
          const lat = Number(item.lat);
          const lng = Number(item.lon);
          const validCoordinates =
            Number.isFinite(lat) &&
            lat >= 4 &&
            lat <= 22 &&
            Number.isFinite(lng) &&
            lng >= 116 &&
            lng <= 128;
          results.push({
            id: `nom-${typeof item.place_id === 'string' || typeof item.place_id === 'number'
              ? item.place_id
              : results.length}`,
            primary,
            secondary,
            value,
            lat: validCoordinates ? lat : null,
            lng: validCoordinates ? lng : null,
          });
        }

        if (results.length >= 10) break;
      }
    }
  }

  return NextResponse.json({ suggestions: results.slice(0, 8) });
}
