import { describe, expect, it } from 'vitest';
import {
  aggregateLocations,
  formatPrivacyCount,
  getSafeLocationQuery,
  normalizeLocationKey,
} from '../src/lib/admin/location-aggregates';
import { isLocationSchemaMissing } from '../src/lib/admin/member-locations';
import { pluralize } from '../src/lib/format';
import { sanitizeLocationSearchQuery } from '../src/lib/location-validation';

describe('admin location aggregates', () => {
  it('only treats missing location schema errors as a migration mismatch', () => {
    expect(isLocationSchemaMissing({
      code: '42703',
      message: 'column profiles.location_lat does not exist',
    })).toBe(true);
    expect(isLocationSchemaMissing({
      code: 'PGRST205',
      message: "Could not find the table 'public.location_geocodes' in the schema cache",
    })).toBe(true);
    expect(isLocationSchemaMissing({
      code: '42501',
      message: 'permission denied for table location_geocodes',
    })).toBe(false);
    expect(isLocationSchemaMissing({
      code: '42703',
      message: 'column profiles.status does not exist',
    })).toBe(false);
  });

  it('normalizes labels for cache lookup and resolves saved coordinates before cache coordinates', () => {
    const label = 'North Example City, Example Province';
    const aggregate = aggregateLocations(
      [
        { id: 'one', location: label, location_lat: 14.1234, location_lng: 121.2345 },
        { id: 'two', location: label },
        { id: 'three', location: label },
      ],
      [{
        label_key: normalizeLocationKey(label),
        label: 'North Example City, Example Province',
        lat: 15,
        lng: 122,
      }],
    );

    expect(aggregate.areas).toEqual([{
      name: 'North Example City',
      province: 'Example Province',
      lat: 14.12,
      lng: 121.23,
      count: 3,
    }]);
    expect(aggregate.mappedPeople).toBe(3);
  });

  it('uses the Laguna gazetteer for legacy text-only profiles', () => {
    const aggregate = aggregateLocations([
      { id: 'one', location: 'Biñan, Laguna' },
      { id: 'two', location: 'Binan City, Laguna' },
      { id: 'three', location: 'Biñan, Laguna, Philippines' },
    ]);

    expect(aggregate.areas).toEqual([{
      name: 'Biñan',
      province: 'Laguna',
      lat: 14.34,
      lng: 121.08,
      count: 3,
    }]);
    expect(aggregate.unmapped).toEqual([]);
  });

  it('only prepares city-level labels for Photon backfill queries', () => {
    expect(getSafeLocationQuery('23 Example Street, Springfield, Example Province'))
      .toBe('Springfield, Example Province');
    expect(getSafeLocationQuery('23 Example Street')).toBeNull();
  });

  it('does not send address-like autocomplete input to external providers', () => {
    expect(sanitizeLocationSearchQuery('23 Example Street, Springfield, Example Province'))
      .toBe('Springfield, Example Province');
    expect(sanitizeLocationSearchQuery('23 Example Street')).toBeNull();
  });

  it('sanitizes unmapped addresses and does not expose labels below the privacy threshold', () => {
    const aggregate = aggregateLocations([
      { id: 'one', location: '23 Example Street, Springfield, Example Province' },
      { id: 'two', location: '23 Example Street, Springfield, Example Province' },
      { id: 'three', location: '23 Example Street, Springfield, Example Province' },
      { id: 'four', location: 'Private District, Example Province' },
    ]);
    const output = JSON.stringify(aggregate);

    expect(aggregate.unmapped).toEqual([{ name: 'Springfield', count: 3 }]);
    expect(aggregate.suppressedPeople).toBe(1);
    expect(output).not.toContain('Example Street');
    expect(output).not.toContain('Private District');
    expect(output).not.toContain('one');
  });

  it('counts unique people and suppresses areas with fewer than three members', () => {
    const aggregate = aggregateLocations([
      { id: 'same-id', location: 'Quezon City, Metro Manila' },
      { id: 'same-id', location: 'Quezon City, Metro Manila' },
      { id: 'another-id', location: 'Quezon City, Metro Manila' },
    ]);

    expect(aggregate.totalPeople).toBe(2);
    expect(aggregate.unmapped).toEqual([]);
    expect(aggregate.suppressedPeople).toBe(2);
  });

  it('formats privacy-safe counts and singular/plural labels', () => {
    expect(formatPrivacyCount(2)).toBe('Fewer than 3');
    expect(formatPrivacyCount(3)).toBe('3');
    expect(pluralize(1, 'area')).toBe('area');
    expect(pluralize(2, 'area')).toBe('areas');
  });
});
