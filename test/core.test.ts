import { describe, it, expect } from 'vitest';
import { rankCandidates, hasClearLead, type CatalogModel } from '../src/lib/ai/match';
import { modelPrefill } from '../src/lib/ai/prefill';
import { tierFor } from '../src/lib/ai/tier';
import { detectScamPhrases } from '../src/lib/scam';
import { suggestCondition } from '../src/lib/condition';
import {
  isAllowedMessageAttachment,
  isImageMessageAttachment,
  MESSAGE_ATTACHMENT_MAX_SIZE,
} from '../src/lib/messages/attachments';
import { validateListingPatch } from '../src/lib/listings/validation';
import { sellerListingStatusPatch } from '../src/lib/listings/status';
import { resolveUsageLimit, secondsUntilDailyReset } from '../src/lib/usage-policy';
import { safeRedirectPath } from '../src/lib/auth/redirect';

const SAMPLE_CATALOG: CatalogModel[] = [
  {
    id: '1',
    brand: 'Lenovo',
    series: 'ThinkPad T14 Gen 2',
    model_number: '20W0',
    cpu: 'Intel Core i5-1135G7',
    gpu: 'Intel Iris Xe',
    screen_size: 14.0,
    default_ram: '8GB',
    default_storage: '256GB',
  },
  {
    id: '2',
    brand: 'Apple',
    series: 'MacBook Air (M1, 2020)',
    model_number: 'A2337',
    cpu: 'Apple M1',
    gpu: 'Apple M1 7-core',
    screen_size: 13.3,
    default_ram: '8GB',
    default_storage: '256GB',
  },
  {
    id: '3',
    brand: 'Dell',
    series: 'Latitude 5420',
    model_number: null,
    cpu: 'Intel Core i5-1145G7',
    gpu: 'Intel Iris Xe',
    screen_size: 14.0,
    default_ram: '8GB',
    default_storage: '256GB',
  },
];

describe('Catalog Matching & Ranking', () => {
  it('prefills model identity only and preserves seller-entered details', () => {
    expect(modelPrefill(SAMPLE_CATALOG[0], {
      cpu: 'Seller-entered CPU',
      ram: '16GB',
      notes: 'Seller notes',
    })).toEqual({
      model_id: '1',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 2 (20W0)',
      title: 'Lenovo ThinkPad T14 Gen 2 (20W0)',
      cpu: 'Seller-entered CPU',
      gpu: null,
      screen_size: null,
      ram: '16GB',
      storage: null,
      description: 'Seller notes',
      ai_filled: ['title', 'brand', 'model'],
    });
  });

  it('identifies exact model number match on sticker text', () => {
    const candidates = rankCandidates(
      SAMPLE_CATALOG,
      {
        isLaptop: true,
        brand: 'Apple',
        series: 'MacBook Air',
        modelNumber: null,
        visibleText: ['Model A2337', 'Designed by Apple in California'],
        confidence: 0.85,
        hintsUsed: [],
      }
    );

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].modelId).toBe('2');
    expect(candidates[0].score).toBe(1);
  });

  it('ranks fuzzy brand and series match when model number is absent', () => {
    const candidates = rankCandidates(
      SAMPLE_CATALOG,
      {
        isLaptop: true,
        brand: 'Dell',
        series: 'Latitude 5420',
        modelNumber: null,
        visibleText: ['DELL logo'],
        confidence: 0.7,
        hintsUsed: [],
      }
    );

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].modelId).toBe('3');
    expect(candidates[0].brand).toBe('Dell');
  });

  it('does not guess a catalog model from brand alone', () => {
    const candidates = rankCandidates(SAMPLE_CATALOG, {
      isLaptop: true,
      brand: 'Dell',
      series: null,
      modelNumber: null,
      visibleText: ['Dell'],
      confidence: 0.9,
      hintsUsed: [],
    });

    expect(candidates).toHaveLength(0);
  });

  it('only prefills a suggested model when the top catalog match is clear', () => {
    expect(hasClearLead([
      { modelId: 'top', score: 0.8, brand: 'ASUS', series: 'TUF Gaming F15', modelNumber: null },
      { modelId: 'second', score: 0.6, brand: 'ASUS', series: 'TUF Gaming A15', modelNumber: null },
    ])).toBe(true);
    expect(hasClearLead([
      { modelId: 'top', score: 0.8, brand: 'ASUS', series: 'TUF Gaming F15', modelNumber: null },
      { modelId: 'second', score: 0.8, brand: 'ASUS', series: 'TUF Gaming A15', modelNumber: null },
    ])).toBe(false);
  });

  it('determines confidence tiers accurately', () => {
    expect(tierFor(0.95)).toBe('auto');
    expect(tierFor(0.8)).toBe('auto');
    expect(tierFor(0.79)).toBe('suggest');
    expect(tierFor(0.5)).toBe('suggest');
    expect(tierFor(0.49)).toBe('manual');
    expect(tierFor(0.2)).toBe('manual');
  });
});

describe('Scam Phrase Detection', () => {
  it('detects off-platform payment phrases in English and Tagalog', () => {
    expect(detectScamPhrases('Can you pay via gcash directly before we ship?')).toContain('pay via gcash directly');
    expect(detectScamPhrases('Bayad muna bago deliver')).toContain('bayad muna');
    expect(detectScamPhrases('Please send the otp you received')).toContain('send the otp');
  });

  it('does not flag normal laptop inquiries', () => {
    expect(detectScamPhrases('Is this still available? Can we meet at SM Megamall?')).toHaveLength(0);
    expect(detectScamPhrases('What is the battery health percentage?')).toHaveLength(0);
  });
});

describe('Condition Suggestion Evaluator', () => {
  it('suggests heavily_used when 3 or more components are poor', () => {
    const result = suggestCondition({
      battery_health: 'poor',
      screen_grade: 'poor',
      keyboard_grade: 'poor',
      hinge_grade: 'good',
    });
    expect(result).toBe('heavily_used');
  });

  it('suggests like_new when all graded checks are good', () => {
    const result = suggestCondition({
      battery_health: 'good',
      screen_grade: 'good',
      keyboard_grade: 'good',
      hinge_grade: 'good',
    });
    expect(result).toBe('like_new');
  });
});

describe('Message attachments', () => {
  it('accepts supported, non-empty files under the size limit', () => {
    expect(isAllowedMessageAttachment({ type: 'image/png', size: 1024 })).toBe(true);
    expect(isAllowedMessageAttachment({ type: 'application/pdf', size: MESSAGE_ATTACHMENT_MAX_SIZE })).toBe(true);
    expect(isImageMessageAttachment('image/webp')).toBe(true);
  });

  it('rejects empty, oversized, and unsupported files', () => {
    expect(isAllowedMessageAttachment({ type: 'image/png', size: 0 })).toBe(false);
    expect(isAllowedMessageAttachment({ type: 'image/png', size: MESSAGE_ATTACHMENT_MAX_SIZE + 1 })).toBe(false);
    expect(isAllowedMessageAttachment({ type: 'application/x-msdownload', size: 1024 })).toBe(false);
    expect(isImageMessageAttachment('application/pdf')).toBe(false);
  });
});

describe('Listing patch validation', () => {
  it('accepts supported editable values and trims text', () => {
    expect(validateListingPatch({
      title: '  ThinkPad T14  ',
      price: 25000,
      condition: 'lightly_used',
      deal_methods: ['public_meetup'],
      screen_size: 14,
    })).toEqual({
      valid: true,
      patch: {
        title: 'ThinkPad T14',
        price: 25000,
        condition: 'lightly_used',
        deal_methods: ['public_meetup'],
        screen_size: 14,
      },
    });
  });

  it('rejects unknown fields, invalid choices, and unsafe numeric values', () => {
    expect(validateListingPatch({ seller_id: 'another-user' }).valid).toBe(false);
    expect(validateListingPatch({ condition: 'unknown' }).valid).toBe(false);
    expect(validateListingPatch({ price: -1 }).valid).toBe(false);
    expect(validateListingPatch({ screen_size: 14.25 }).valid).toBe(false);
    expect(validateListingPatch(null).valid).toBe(false);
  });

  it('accepts valid nullable location coordinates and rejects incomplete or invalid pairs', () => {
    expect(validateListingPatch({
      location: 'San Pablo City, Laguna',
      location_lat: 14.07,
      location_lng: 121.325,
      location_label: 'San Pablo City, Laguna',
    }).valid).toBe(true);
    expect(validateListingPatch({ location_lat: 14, location_label: 'City' }).valid).toBe(false);
    expect(validateListingPatch({ location_lat: Number.NaN, location_lng: 121 }).valid).toBe(false);
    expect(validateListingPatch({ location_lat: 91, location_lng: 121 }).valid).toBe(false);
    expect(validateListingPatch({
      location_label: 'x'.repeat(121),
    }).valid).toBe(false);
  });
});

describe('Seller listing status actions', () => {
  it('supports active, reserved, and sold transitions with reservation cleanup', () => {
    expect(sellerListingStatusPatch('available', 'reserved')).toEqual({
      status: 'reserved',
      reserved_by: null,
      reserved_until: null,
      buyer_id: null,
    });
    expect(sellerListingStatusPatch('reserved', 'available')).toEqual({
      status: 'available',
      reserved_by: null,
      reserved_until: null,
      buyer_id: null,
    });
    expect(sellerListingStatusPatch('reserved', 'sold')).toEqual({
      status: 'sold',
      reserved_by: null,
      reserved_until: null,
    });
  });

  it('rejects unsupported, draft, and repeated status transitions', () => {
    expect(sellerListingStatusPatch('draft', 'available')).toBeNull();
    expect(sellerListingStatusPatch('sold', 'available')).toBeNull();
    expect(sellerListingStatusPatch('available', 'draft')).toBeNull();
    expect(sellerListingStatusPatch('available', 'available')).toBeNull();
  });
});

describe('Usage limit decisions', () => {
  it('fails closed when the usage counter is unavailable', () => {
    expect(resolveUsageLimit(null, true)).toBe('unavailable');
    expect(resolveUsageLimit(null, false)).toBe('unavailable');
    expect(resolveUsageLimit(false, false)).toBe('limited');
    expect(resolveUsageLimit(true, false)).toBe('allowed');
  });

  it('returns a positive retry delay until the next UTC day', () => {
    expect(secondsUntilDailyReset(new Date('2026-11-15T12:00:00.000Z'))).toBe(43200);
  });
});

describe('Authentication redirects', () => {
  it('keeps internal paths and rejects external redirect forms', () => {
    expect(safeRedirectPath('/dashboard?tab=active')).toBe('/dashboard?tab=active');
    expect(safeRedirectPath('https://outside.example')).toBe('/');
    expect(safeRedirectPath('//outside.example')).toBe('/');
    expect(safeRedirectPath('/\\\\outside.example')).toBe('/');
    expect(safeRedirectPath('/%2e//outside.example')).toBe('/');
  });
});
