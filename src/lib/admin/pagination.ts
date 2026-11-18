export const ADMIN_PAGE_SIZE = 25;

export type AdminSearchParam = string | string[] | undefined;
export type AdminReportStatus = 'open' | 'resolved' | 'dismissed' | 'all';

function firstValue(value: AdminSearchParam) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseAdminPage(value: AdminSearchParam) {
  const page = Number(firstValue(value));
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function getAdminPageRange(page: number) {
  return {
    from: (page - 1) * ADMIN_PAGE_SIZE,
    to: page * ADMIN_PAGE_SIZE - 1,
  };
}

export function parseAdminReportStatus(value: AdminSearchParam): AdminReportStatus {
  const status = firstValue(value);
  return status === 'resolved' || status === 'dismissed' || status === 'all'
    ? status
    : 'open';
}

export function adminPageHref(
  path: string,
  page: number,
  query: Record<string, string> = {},
) {
  const searchParams = new URLSearchParams(query);
  searchParams.set('page', String(page));
  return `${path}?${searchParams.toString()}`;
}
