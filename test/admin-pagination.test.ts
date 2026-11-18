import { describe, expect, it } from 'vitest';
import {
  ADMIN_PAGE_SIZE,
  adminPageHref,
  getAdminPageRange,
  parseAdminPage,
  parseAdminReportStatus,
} from '../src/lib/admin/pagination';

describe('admin pagination', () => {
  it('defaults invalid page parameters to the first page', () => {
    expect(parseAdminPage(undefined)).toBe(1);
    expect(parseAdminPage('0')).toBe(1);
    expect(parseAdminPage('-2')).toBe(1);
    expect(parseAdminPage('2.5')).toBe(1);
    expect(parseAdminPage(['3', '4'])).toBe(3);
  });

  it('calculates inclusive database ranges', () => {
    expect(getAdminPageRange(1)).toEqual({ from: 0, to: ADMIN_PAGE_SIZE - 1 });
    expect(getAdminPageRange(3)).toEqual({ from: 50, to: 74 });
  });

  it('accepts only supported report status filters', () => {
    expect(parseAdminReportStatus('resolved')).toBe('resolved');
    expect(parseAdminReportStatus('dismissed')).toBe('dismissed');
    expect(parseAdminReportStatus('all')).toBe('all');
    expect(parseAdminReportStatus('invalid')).toBe('open');
  });

  it('preserves filters when generating pagination links', () => {
    expect(adminPageHref('/admin/reports', 2, { status: 'resolved' }))
      .toBe('/admin/reports?status=resolved&page=2');
  });
});
