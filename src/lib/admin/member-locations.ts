import type { createClient } from '@/lib/supabase/server';
import {
  aggregateLocations,
  type LocationAggregate,
  type LocationGeocode,
  type LocationPerson,
} from './location-aggregates';

export type AdminMemberLocations = {
  all: LocationAggregate;
  buyers: LocationAggregate;
  sellers: LocationAggregate;
  migrationWarning: boolean;
};

type ProfileLocation = LocationPerson & {
  role: string;
};

const PAGE_SIZE = 500;

export function isLocationSchemaMissing(error: { code?: string; message?: string }): boolean {
  const missingSchemaCodes = new Set(['42703', 'PGRST204', '42P01', 'PGRST205']);
  return (
    Boolean(error.code && missingSchemaCodes.has(error.code)) &&
    /location_(lat|lng|label|geocodes)/i.test(error.message || '')
  );
}

async function loadProfiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  includeCoordinates: boolean,
): Promise<{ profiles: ProfileLocation[]; missingCoordinates: boolean }> {
  const profiles: ProfileLocation[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const result = includeCoordinates
      ? await supabase
          .from('profiles')
          .select('id, role, default_location, location_lat, location_lng, location_label')
          .eq('status', 'active')
          .order('id')
          .range(from, from + PAGE_SIZE - 1)
      : await supabase
          .from('profiles')
          .select('id, role, default_location')
          .eq('status', 'active')
          .order('id')
          .range(from, from + PAGE_SIZE - 1);
    if (result.error) {
      if (includeCoordinates && isLocationSchemaMissing(result.error)) {
        return { profiles: [], missingCoordinates: true };
      }
      throw new Error(`Unable to load active member locations: ${result.error.message}`);
    }

    profiles.push(
      ...(result.data ?? []).map((profile) => ({
        id: profile.id,
        role: profile.role,
        location: profile.default_location,
        location_lat:
          'location_lat' in profile && typeof profile.location_lat === 'number'
            ? profile.location_lat
            : null,
        location_lng:
          'location_lng' in profile && typeof profile.location_lng === 'number'
            ? profile.location_lng
            : null,
        location_label:
          'location_label' in profile && typeof profile.location_label === 'string'
            ? profile.location_label
            : null,
      })),
    );
    if (!result.data || result.data.length < PAGE_SIZE) {
      return { profiles, missingCoordinates: false };
    }
  }
}

async function loadActiveSellerIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Set<string>> {
  const activeSellerIds = new Set<string>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('is_visible', true)
      .in('status', ['available', 'reserved'])
      .order('seller_id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Unable to load active sellers for the admin map: ${error.message}`);
    for (const listing of data ?? []) activeSellerIds.add(listing.seller_id);
    if (!data || data.length < PAGE_SIZE) return activeSellerIds;
  }
}

async function loadGeocodes(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ geocodes: LocationGeocode[]; missingTable: boolean }> {
  const geocodes: LocationGeocode[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('location_geocodes')
      .select('label_key, label, lat, lng')
      .order('label_key')
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      if (isLocationSchemaMissing(error)) return { geocodes: [], missingTable: true };
      throw new Error(`Unable to load cached location coordinates: ${error.message}`);
    }
    geocodes.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return { geocodes, missingTable: false };
  }
}

export async function getAdminMemberLocations(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<AdminMemberLocations> {
  const [profileAttempt, activeSellerIds, geocodeResult] = await Promise.all([
    loadProfiles(supabase, true),
    loadActiveSellerIds(supabase),
    loadGeocodes(supabase),
  ]);
  const profileResult = profileAttempt.missingCoordinates
    ? await loadProfiles(supabase, false)
    : profileAttempt;
  const profiles = profileResult.profiles;
  const geocodes = geocodeResult.geocodes;
  const migrationWarning = profileAttempt.missingCoordinates || geocodeResult.missingTable;
  if (migrationWarning) {
    console.warn('Location coordinate migration is missing; loading legacy location data for the admin map.');
  }

  const buyers = profiles.filter((profile) => profile.role === 'buyer');
  const sellers = profiles.filter((profile) => activeSellerIds.has(profile.id));
  const allMemberIds = new Set([...buyers, ...sellers].map((profile) => profile.id));
  const allMembers = profiles.filter((profile) => allMemberIds.has(profile.id));

  return {
    all: aggregateLocations(allMembers, geocodes),
    buyers: aggregateLocations(buyers, geocodes),
    sellers: aggregateLocations(sellers, geocodes),
    migrationWarning,
  };
}
