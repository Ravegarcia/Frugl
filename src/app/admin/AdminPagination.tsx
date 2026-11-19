import Link from 'next/link';
import { ChevronLeft, ChevronRight } from '@/components/icons';
import { ADMIN_PAGE_SIZE, adminPageHref } from '@/lib/admin/pagination';

export default function AdminPagination({
  path,
  page,
  totalPages,
  totalCount,
  showSinglePage = false,
  query,
}: {
  path: string;
  page: number;
  totalPages: number;
  totalCount: number;
  showSinglePage?: boolean;
  query?: Record<string, string>;
}) {
  if (totalPages <= 1 && !showSinglePage) return null;

  const firstItem = totalCount === 0 ? 0 : (page - 1) * ADMIN_PAGE_SIZE + 1;
  const lastItem = Math.min(page * ADMIN_PAGE_SIZE, totalCount);

  return (
    <nav className='admin-pagination' aria-label='Pagination'>
      <span className='admin-pagination-status'>
        {firstItem}–{lastItem} of {totalCount.toLocaleString()}
      </span>
      <div className='admin-pagination-controls'>
        {page > 1 ? (
          <Link
            href={adminPageHref(path, page - 1, query)}
            className='admin-pagination-control'
            aria-label='Go to previous page'
          >
            <ChevronLeft size={18} aria-hidden='true' />
          </Link>
        ) : (
          <span className='admin-pagination-control' aria-disabled='true' aria-label='No previous page'>
            <ChevronLeft size={18} aria-hidden='true' />
          </span>
        )}
        {page < totalPages ? (
          <Link
            href={adminPageHref(path, page + 1, query)}
            className='admin-pagination-control'
            aria-label='Go to next page'
          >
            <ChevronRight size={18} aria-hidden='true' />
          </Link>
        ) : (
          <span className='admin-pagination-control' aria-disabled='true' aria-label='No next page'>
            <ChevronRight size={18} aria-hidden='true' />
          </span>
        )}
      </div>
    </nav>
  );
}
