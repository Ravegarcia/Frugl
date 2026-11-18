import Link from 'next/link';
import { adminPageHref } from '@/lib/admin/pagination';

export default function AdminPagination({
  path,
  page,
  totalPages,
  query,
}: {
  path: string;
  page: number;
  totalPages: number;
  query?: Record<string, string>;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className='admin-pagination' aria-label='Pagination'>
      {page > 1 ? (
        <Link
          href={adminPageHref(path, page - 1, query)}
          className='admin-pagination-control'
          aria-label='Go to previous page'
        >
          <span aria-hidden='true'>←</span>
          <span>Previous</span>
        </Link>
      ) : (
        <span className='admin-pagination-control' aria-disabled='true'>Previous</span>
      )}
      <span className='admin-pagination-status'>Page {page} of {totalPages}</span>
      {page < totalPages ? (
        <Link
          href={adminPageHref(path, page + 1, query)}
          className='admin-pagination-control'
          aria-label='Go to next page'
        >
          <span>Next</span>
          <span aria-hidden='true'>→</span>
        </Link>
      ) : (
        <span className='admin-pagination-control' aria-disabled='true'>Next</span>
      )}
    </nav>
  );
}
