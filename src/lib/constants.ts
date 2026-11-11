export const CONDITIONS = [
  { value: 'brand_new', label: 'Brand New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'lightly_used', label: 'Lightly Used' },
  { value: 'well_used', label: 'Well Used' },
  { value: 'heavily_used', label: 'Heavily Used' },
];

export const DEAL_METHODS = [
  { value: 'public_meetup', label: 'Public Meetup' },
  { value: 'door_pickup', label: 'Door Pickup' },
  { value: 'door_dropoff', label: 'Door Dropoff' },
];

export const RAM_OPTIONS = ['4GB', '8GB', '12GB', '16GB', '32GB', '64GB'];
export const STORAGE_OPTIONS = ['128GB', '256GB', '512GB', '1TB', '2TB'];
export const BRANDS = ['Acer', 'Apple', 'ASUS', 'Dell', 'Gigabyte', 'HP', 'Huawei', 'Lenovo', 'Microsoft', 'MSI', 'Razer', 'Samsung', 'Other'];

export const conditionLabel = (v?: string | null) => CONDITIONS.find((c) => c.value === v)?.label ?? '';
export const dealLabel = (v?: string | null) => DEAL_METHODS.find((d) => d.value === v)?.label ?? '';

export function formatPrice(n: number | string | null | undefined) {
  if (n === null || n === undefined || n === '') return '';
  return '₱' + Number(n).toLocaleString('en-PH');
}
