export const CARD_SELECT = 'id,title,price,condition,location,brand,model,status,created_at,is_featured,listing_photos(image_url,sort_order)';

export function coverUrl(listing: any): string | null {
  const photos = [...(listing.listing_photos ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
  return photos[0]?.image_url ?? null;
}
