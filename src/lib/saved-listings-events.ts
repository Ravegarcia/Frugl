export const SAVED_LISTING_CHANGED_EVENT = 'frugl:saved-listing-changed';
const UNSEEN_SAVED_LISTINGS_CHANGED_EVENT = 'frugl:unseen-saved-listings-changed';

export type SavedListingChange = {
  userId: string;
  listingId: string;
  saved: boolean;
};

function storageKey(userId: string) {
  return `frugl:unseen-saved-listings:${userId}`;
}

export function getUnseenSavedListingIds(userId: string, initialIds: string[]) {
  if (typeof window === 'undefined') return initialIds;

  try {
    const stored = window.localStorage.getItem(storageKey(userId));
    if (stored === null) return initialIds;
    const ids: unknown = JSON.parse(stored);
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  } catch (error) {
    console.error('Could not read saved-listing notification state:', error);
    return initialIds;
  }
}

export function setUnseenSavedListingIds(userId: string, ids: string[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(ids));
  } catch (error) {
    console.error('Could not update saved-listing notification state:', error);
  }
  window.dispatchEvent(new CustomEvent(UNSEEN_SAVED_LISTINGS_CHANGED_EVENT, { detail: userId }));
}

export function subscribeToUnseenSavedListings(userId: string, onChange: () => void) {
  const handleCustomChange = (event: Event) => {
    if ((event as CustomEvent<string>).detail === userId) onChange();
  };
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === storageKey(userId)) onChange();
  };

  window.addEventListener(UNSEEN_SAVED_LISTINGS_CHANGED_EVENT, handleCustomChange);
  window.addEventListener('storage', handleStorageChange);
  return () => {
    window.removeEventListener(UNSEEN_SAVED_LISTINGS_CHANGED_EVENT, handleCustomChange);
    window.removeEventListener('storage', handleStorageChange);
  };
}

export function dispatchSavedListingChanged(change: SavedListingChange) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<SavedListingChange>(SAVED_LISTING_CHANGED_EVENT, { detail: change }));
}
