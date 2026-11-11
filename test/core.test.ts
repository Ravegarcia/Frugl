import { describe, it, expect } from 'vitest';
import { rankCandidates, combineConfidence, modelLabel, type CatalogModel } from '../src/lib/ai/match';
import { tierFor } from '../src/lib/ai/tier';
import { detectScamPhrases } from '../src/lib/scam';
import { suggestCondition } from '../src/lib/condition';

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
  it('identifies exact model number match on sticker text', () => {
    const candidates = rankCandidates(
      SAMPLE_CATALOG,
      {
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
