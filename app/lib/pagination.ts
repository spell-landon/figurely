/**
 * Pagination utilities for server-side pagination
 */

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;
}

/**
 * Default items per page
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Available page size options
 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/**
 * Parse pagination params from URL search params
 */
export function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(
    1,
    parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10)
  );

  return { page, limit };
}

/**
 * Calculate pagination metadata
 */
export function calculatePaginationMeta(
  totalItems: number,
  currentPage: number,
  itemsPerPage: number
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage - 1, totalItems - 1);

  return {
    currentPage: safePage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
    startIndex,
    endIndex,
  };
}

/**
 * Get Supabase range parameters for pagination
 * Supabase uses zero-based indexing for .range()
 */
export function getSupabaseRange(
  page: number,
  limit: number
): { from: number; to: number } {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return { from, to };
}

/**
 * Generate page numbers to display in pagination
 * Shows first page, last page, current page, and surrounding pages
 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 7
): (number | 'ellipsis')[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [];
  const halfVisible = Math.floor(maxVisible / 2);

  // Always show first page
  pages.push(1);

  let startPage = Math.max(2, currentPage - halfVisible);
  let endPage = Math.min(totalPages - 1, currentPage + halfVisible);

  // Adjust range if we're near the start or end
  if (currentPage <= halfVisible) {
    endPage = maxVisible - 1;
  } else if (currentPage >= totalPages - halfVisible) {
    startPage = totalPages - maxVisible + 2;
  }

  // Add ellipsis after first page if needed
  if (startPage > 2) {
    pages.push('ellipsis');
  }

  // Add middle pages
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  // Add ellipsis before last page if needed
  if (endPage < totalPages - 1) {
    pages.push('ellipsis');
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

/**
 * Create URL with updated pagination params
 */
export function createPaginationUrl(
  baseUrl: string,
  searchParams: URLSearchParams,
  updates: Partial<PaginationParams>
): string {
  const params = new URLSearchParams(searchParams);

  if (updates.page !== undefined) {
    params.set('page', String(updates.page));
  }

  if (updates.limit !== undefined) {
    params.set('limit', String(updates.limit));
  }

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
