import { Link, useSearchParams } from '@remix-run/react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Select } from '~/components/ui/select';
import {
  calculatePaginationMeta,
  getPageNumbers,
  PAGE_SIZE_OPTIONS,
  type PaginationMeta,
} from '~/lib/pagination';

export interface PaginationProps {
  /**
   * Total number of items across all pages
   */
  totalItems: number;

  /**
   * Current page number (1-indexed)
   */
  currentPage: number;

  /**
   * Number of items per page
   */
  itemsPerPage: number;

  /**
   * Base path for pagination links (e.g., '/dashboard/invoices')
   */
  basePath: string;

  /**
   * Additional search params to preserve in pagination links
   */
  preserveParams?: string[];
}

export function Pagination({
  totalItems,
  currentPage,
  itemsPerPage,
  basePath,
  preserveParams = [],
}: PaginationProps) {
  const [searchParams] = useSearchParams();
  const meta = calculatePaginationMeta(totalItems, currentPage, itemsPerPage);

  // If there's only one page or no items, don't show pagination
  if (meta.totalPages <= 1) {
    return null;
  }

  const pageNumbers = getPageNumbers(meta.currentPage, meta.totalPages);

  /**
   * Create a URL for a specific page while preserving specified params
   */
  function createPageUrl(page: number): string {
    const params = new URLSearchParams();

    // Preserve specified params
    preserveParams.forEach((param) => {
      const value = searchParams.get(param);
      if (value) {
        params.set(param, value);
      }
    });

    // Set pagination params
    params.set('page', String(page));
    if (itemsPerPage !== 20) {
      params.set('limit', String(itemsPerPage));
    }

    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  }

  /**
   * Create a URL with updated items per page
   */
  function createLimitUrl(limit: number): string {
    const params = new URLSearchParams();

    // Preserve specified params
    preserveParams.forEach((param) => {
      const value = searchParams.get(param);
      if (value) {
        params.set(param, value);
      }
    });

    // Reset to page 1 when changing limit
    params.set('page', '1');
    params.set('limit', String(limit));

    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
      {/* Items count and per-page selector */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground md:text-sm">
        <span>
          Showing{' '}
          <span className="font-medium text-foreground">
            {meta.startIndex + 1}
          </span>{' '}
          to{' '}
          <span className="font-medium text-foreground">
            {meta.endIndex + 1}
          </span>{' '}
          of{' '}
          <span className="font-medium text-foreground">{meta.totalItems}</span>
        </span>
        <span className="hidden md:inline">·</span>
        <div className="flex items-center gap-2">
          <span className="hidden md:inline">Show</span>
          <Select
            value={String(itemsPerPage)}
            onChange={(e) => {
              // Navigate to the new URL with updated limit
              window.location.href = createLimitUrl(parseInt(e.target.value, 10));
            }}
            className="h-8 w-16 md:h-9 md:w-20">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={String(size)}>
                {size}
              </option>
            ))}
          </Select>
          <span>per page</span>
        </div>
      </div>

      {/* Page navigation */}
      <div className="flex items-center justify-center gap-1 md:gap-2">
        {/* First page button (mobile hidden) */}
        <Link
          to={createPageUrl(1)}
          className={meta.hasPreviousPage ? '' : 'pointer-events-none'}
          aria-disabled={!meta.hasPreviousPage}>
          <Button
            variant="outline"
            size="icon"
            disabled={!meta.hasPreviousPage}
            className="hidden h-8 w-8 md:flex md:h-9 md:w-9">
            <ChevronsLeft className="h-4 w-4" />
            <span className="sr-only">First page</span>
          </Button>
        </Link>

        {/* Previous page button */}
        <Link
          to={createPageUrl(meta.currentPage - 1)}
          className={meta.hasPreviousPage ? '' : 'pointer-events-none'}
          aria-disabled={!meta.hasPreviousPage}>
          <Button
            variant="outline"
            size="icon"
            disabled={!meta.hasPreviousPage}
            className="h-8 w-8 md:h-9 md:w-9">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>
        </Link>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((pageNum, index) => {
            if (pageNum === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground md:h-9 md:w-9">
                  ...
                </span>
              );
            }

            const isCurrentPage = pageNum === meta.currentPage;

            return (
              <Link
                key={pageNum}
                to={createPageUrl(pageNum)}
                aria-current={isCurrentPage ? 'page' : undefined}>
                <Button
                  variant={isCurrentPage ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8 md:h-9 md:w-9">
                  <span className="text-xs md:text-sm">{pageNum}</span>
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Next page button */}
        <Link
          to={createPageUrl(meta.currentPage + 1)}
          className={meta.hasNextPage ? '' : 'pointer-events-none'}
          aria-disabled={!meta.hasNextPage}>
          <Button
            variant="outline"
            size="icon"
            disabled={!meta.hasNextPage}
            className="h-8 w-8 md:h-9 md:w-9">
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
        </Link>

        {/* Last page button (mobile hidden) */}
        <Link
          to={createPageUrl(meta.totalPages)}
          className={meta.hasNextPage ? '' : 'pointer-events-none'}
          aria-disabled={!meta.hasNextPage}>
          <Button
            variant="outline"
            size="icon"
            disabled={!meta.hasNextPage}
            className="hidden h-8 w-8 md:flex md:h-9 md:w-9">
            <ChevronsRight className="h-4 w-4" />
            <span className="sr-only">Last page</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
