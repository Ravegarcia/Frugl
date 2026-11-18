import { NextRequest, NextResponse } from 'next/server';

export interface LocationSuggestion {
  id: string;
  primary: string;
  secondary: string;
  value: string;
}

// Curated fast-path locations (Philippine cities/municipalities)
// Provides instant zero-latency matches and fallback if external OSM endpoints are slow or offline.
const CURATED_LOCATIONS: LocationSuggestion[] = [
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

function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bcity\b/gi, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
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

  // 2. Query Photon (with place layers + country-wide Philippines zoom bias) and Nominatim in parallel
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  // Filter out street/highway noise using layer=city,locality,district,county,state
  // Center bias on the Philippines (12.8797, 121.7740) at country zoom=6 so provinces outside Manila aren't penalized
  const photonUrl =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}` +
    `&lat=12.8797&lon=121.7740&zoom=6&location_bias_scale=0.5` +
    `&layer=city&layer=locality&layer=district&layer=county&layer=state` +
    `&limit=12&lang=en`;

  const nominatimUrl =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1` +
    `&countrycodes=ph&limit=6&q=${encodeURIComponent(q)}`;

  try {
    const [photonSettled, nominatimSettled] = await Promise.allSettled([
      fetch(photonUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'FruglMarketplace/1.0 (Location Autocomplete)',
        },
        signal: controller.signal,
        next: { revalidate: 3600 },
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(nominatimUrl, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en',
          'User-Agent': 'FruglMarketplace/1.0 (Location Autocomplete)',
        },
        signal: controller.signal,
        next: { revalidate: 3600 },
      }).then((r) => (r.ok ? r.json() : null)),
    ]);

    clearTimeout(timeout);

    // Process Photon results
    if (photonSettled.status === 'fulfilled' && photonSettled.value) {
      const features = Array.isArray(photonSettled.value.features)
        ? photonSettled.value.features
        : [];

      for (const feat of features) {
        const props = feat?.properties;
        if (!props?.name) continue;

        const name: string = props.name;
        const city: string | undefined = props.city || props.town || props.locality;
        const state: string | undefined = props.state || props.county;
        const country: string | undefined = props.country;
        const placeType = formatPlaceType(props.osm_value, props.type);

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

        const value =
          regionLabel && normalize(regionLabel) !== normalize(name)
            ? `${name}, ${regionLabel}`
            : name;

        const dedupeKey = normalize(`${name}|${state || ''}|${city || ''}|${country || ''}`);
        if (!seenKeys.has(dedupeKey) && !seenKeys.has(normalize(value))) {
          seenKeys.add(dedupeKey);
          seenKeys.add(normalize(value));
          results.push({
            id: `osm-${props.osm_id || results.length}`,
            primary,
            secondary,
            value,
          });
        }

        if (results.length >= 10) break;
      }
    }

    // Process Nominatim PH results to catch any Philippine barangays/towns missed by Photon
    if (nominatimSettled.status === 'fulfilled' && Array.isArray(nominatimSettled.value)) {
      for (const item of nominatimSettled.value) {
        const name: string =
          item.name || (item.display_name ? item.display_name.split(',')[0] : '');
        if (!name) continue;
        const addr = item.address || {};
        const city = addr.city || addr.town || addr.municipality;
        const state = addr.state || addr.province || addr.region || addr.county;
        const country = addr.country || 'Philippines';
        const placeType = formatPlaceType(item.type, item.category);

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
        const value =
          regionLabel && normalize(regionLabel) !== normalize(name)
            ? `${name}, ${regionLabel}`
            : name;

        const dedupeKey = normalize(`${name}|${state || ''}|${city || ''}|${country || ''}`);
        if (!seenKeys.has(dedupeKey) && !seenKeys.has(normalize(value))) {
          seenKeys.add(dedupeKey);
          seenKeys.add(normalize(value));
          results.push({
            id: `nom-${item.place_id || results.length}`,
            primary,
            secondary,
            value,
          });
        }

        if (results.length >= 10) break;
      }
    }
  } catch {
    clearTimeout(timeout);
  }

  return NextResponse.json({ suggestions: results.slice(0, 8) });
}
