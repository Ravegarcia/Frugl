import { CONDITIONS, DEAL_METHODS } from '../constants';

const TEXT_LIMITS = {
  title: 120,
  description: 5000,
  brand: 60,
  model: 120,
  location: 120,
  address_detail: 300,
  cpu: 160,
  gpu: 160,
  ram: 40,
  storage: 40,
} as const;

const OPTIONAL_TEXT_FIELDS = new Set(['address_detail', 'cpu', 'gpu', 'ram', 'storage']);
const EDITABLE_FIELDS = new Set([
  ...Object.keys(TEXT_LIMITS),
  'price',
  'condition',
  'deal_methods',
  'screen_size',
]);
const VALID_CONDITIONS = new Set(CONDITIONS.map(({ value }) => value));
const VALID_DEAL_METHODS = new Set(DEAL_METHODS.map(({ value }) => value));

export type ListingPatchValidation =
  | { valid: true; patch: Record<string, unknown> }
  | { valid: false; error: string };

export function validateListingPatch(value: unknown): ListingPatchValidation {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { valid: false, error: 'Listing changes must be a JSON object.' };
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return { valid: false, error: 'Add at least one listing change.' };
  }

  const patch: Record<string, unknown> = {};

  for (const [field, fieldValue] of entries) {
    if (!EDITABLE_FIELDS.has(field)) {
      return { valid: false, error: 'One or more listing fields cannot be changed.' };
    }

    if (field in TEXT_LIMITS) {
      if (fieldValue === null && OPTIONAL_TEXT_FIELDS.has(field)) {
        patch[field] = null;
        continue;
      }
      if (typeof fieldValue !== 'string') {
        return { valid: false, error: `${field} must be text.` };
      }
      const text = fieldValue.trim();
      if (text.length > TEXT_LIMITS[field as keyof typeof TEXT_LIMITS]) {
        return { valid: false, error: `${field} must be ${TEXT_LIMITS[field as keyof typeof TEXT_LIMITS]} characters or fewer.` };
      }
      patch[field] = text;
      continue;
    }

    if (field === 'price') {
      if (
        fieldValue !== null &&
        (typeof fieldValue !== 'number' ||
          !Number.isFinite(fieldValue) ||
          fieldValue < 0 ||
          fieldValue > 9_999_999_999.99 ||
          Math.abs(fieldValue * 100 - Math.round(fieldValue * 100)) > 1e-7)
      ) {
        return { valid: false, error: 'Price must be a non-negative amount with at most two decimal places.' };
      }
      patch.price = fieldValue;
      continue;
    }

    if (field === 'screen_size') {
      if (
        fieldValue !== null &&
        (typeof fieldValue !== 'number' ||
          !Number.isFinite(fieldValue) ||
          fieldValue < 8 ||
          fieldValue > 99.9 ||
          Math.abs(fieldValue * 10 - Math.round(fieldValue * 10)) > 1e-7)
      ) {
        return { valid: false, error: 'Screen size must be between 8 and 99.9 inches.' };
      }
      patch.screen_size = fieldValue;
      continue;
    }

    if (field === 'condition') {
      if (fieldValue !== null && (typeof fieldValue !== 'string' || !VALID_CONDITIONS.has(fieldValue))) {
        return { valid: false, error: 'Choose a valid laptop condition.' };
      }
      patch.condition = fieldValue;
      continue;
    }

    if (field === 'deal_methods') {
      if (
        !Array.isArray(fieldValue) ||
        fieldValue.length > VALID_DEAL_METHODS.size ||
        fieldValue.some((method) => typeof method !== 'string' || !VALID_DEAL_METHODS.has(method)) ||
        new Set(fieldValue).size !== fieldValue.length
      ) {
        return { valid: false, error: 'Choose valid, non-duplicate deal methods.' };
      }
      patch.deal_methods = fieldValue;
    }
  }

  return { valid: true, patch };
}
