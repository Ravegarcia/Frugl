export const LOCATION_LABEL_MAX_LENGTH = 120;
const ADDRESS_QUERY_PART = /\d|\b(street|st\.|road|rd\.|avenue|ave\.|lane|ln\.|drive|dr\.|building|bldg|unit|floor|lot|block|purok|barangay|brgy|apartment|apt\.)\b/i;

export function sanitizeLocationSearchQuery(value: string): string | null {
  const safeParts = value
    .split(/[,/]/)
    .map((part) => part.trim())
    .filter((part) => part && !ADDRESS_QUERY_PART.test(part));
  const query = safeParts.slice(-2).join(', ').slice(0, LOCATION_LABEL_MAX_LENGTH);
  return query || null;
}

export function isValidLocationCoordinates(lat: unknown, lng: unknown): boolean {
  if (lat === null && lng === null) return true;

  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

export function isValidLocationLabel(label: unknown): boolean {
  return (
    label === null ||
    (typeof label === 'string' && label.trim().length <= LOCATION_LABEL_MAX_LENGTH)
  );
}
