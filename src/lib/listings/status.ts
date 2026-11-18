export type SellerListingStatusPatch = {
  status: 'available' | 'reserved' | 'sold';
  reserved_by?: null;
  reserved_until?: null;
  buyer_id?: null;
};

export function sellerListingStatusPatch(
  currentStatus: string,
  requestedStatus: unknown
): SellerListingStatusPatch | null {
  if (currentStatus === 'available' && requestedStatus === 'reserved') {
    return {
      status: 'reserved',
      reserved_by: null,
      reserved_until: null,
      buyer_id: null,
    };
  }

  if (currentStatus === 'reserved' && requestedStatus === 'available') {
    return {
      status: 'available',
      reserved_by: null,
      reserved_until: null,
      buyer_id: null,
    };
  }

  if (
    (currentStatus === 'available' || currentStatus === 'reserved') &&
    requestedStatus === 'sold'
  ) {
    return {
      status: 'sold',
      reserved_by: null,
      reserved_until: null,
    };
  }

  return null;
}
