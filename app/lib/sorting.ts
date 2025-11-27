/**
 * Sorting utilities for table columns
 * Handles URL-based sort state and Supabase query building
 */

export type SortOrder = "asc" | "desc";

export interface SortParams {
  sortBy: string | null;
  sortOrder: SortOrder;
}

/**
 * Parse sorting parameters from URL search params
 * @param searchParams - URL search params
 * @param defaultSortBy - Default column to sort by
 * @param defaultSortOrder - Default sort order
 * @returns Parsed sort parameters
 */
export function parseSortParams(
  searchParams: URLSearchParams,
  defaultSortBy: string = "created_at",
  defaultSortOrder: SortOrder = "desc"
): SortParams {
  const sortBy = searchParams.get("sort") || defaultSortBy;
  const sortOrder = (searchParams.get("order") as SortOrder) || defaultSortOrder;

  // Validate sort order
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    return { sortBy, sortOrder: defaultSortOrder };
  }

  return { sortBy, sortOrder };
}

/**
 * Build a URL with updated sort parameters
 * @param currentParams - Current URL search params
 * @param sortBy - Column to sort by
 * @param currentSortBy - Currently sorted column
 * @param currentSortOrder - Current sort order
 * @returns Updated search params string
 */
export function buildSortUrl(
  currentParams: URLSearchParams,
  sortBy: string,
  currentSortBy: string | null,
  currentSortOrder: SortOrder
): string {
  const params = new URLSearchParams(currentParams);

  // If clicking the same column, toggle order
  if (sortBy === currentSortBy) {
    const newOrder = currentSortOrder === "asc" ? "desc" : "asc";
    params.set("order", newOrder);
  } else {
    // New column, default to descending for most columns
    // (ascending for name/text columns)
    const isTextColumn = sortBy.includes("name") || sortBy.includes("email");
    params.set("sort", sortBy);
    params.set("order", isTextColumn ? "asc" : "desc");
  }

  // Reset to page 1 when changing sort
  params.set("page", "1");

  return `?${params.toString()}`;
}

/**
 * Get the sort indicator icon for a column header
 * @param columnName - Name of the column
 * @param currentSortBy - Currently sorted column
 * @param currentSortOrder - Current sort order
 * @returns "asc" | "desc" | null
 */
export function getSortIndicator(
  columnName: string,
  currentSortBy: string | null,
  currentSortOrder: SortOrder
): SortOrder | null {
  if (columnName !== currentSortBy) return null;
  return currentSortOrder;
}

/**
 * Apply sorting to a Supabase query
 * @param query - Supabase query builder
 * @param sortBy - Column to sort by
 * @param sortOrder - Sort order
 * @param columnMap - Optional mapping of display names to database columns
 * @returns Query with sorting applied
 */
export function applySupabaseSorting<T>(
  query: any,
  sortBy: string,
  sortOrder: SortOrder,
  columnMap?: Record<string, string>
): any {
  // Map display column name to actual database column if mapping provided
  const dbColumn = columnMap?.[sortBy] || sortBy;

  return query.order(dbColumn, { ascending: sortOrder === "asc" });
}

/**
 * Common column mappings for invoice-related tables
 */
export const invoiceColumnMap: Record<string, string> = {
  client: "bill_to_name",
  amount: "total_amount",
  status: "status",
  date: "date",
  invoice_number: "invoice_number",
  created: "created_at",
};

export const expenseColumnMap: Record<string, string> = {
  date: "date",
  description: "description",
  merchant: "merchant",
  category: "category",
  amount: "total",
  created: "created_at",
};

export const clientColumnMap: Record<string, string> = {
  name: "name",
  contact: "contact_person",
  email: "email",
  phone: "phone",
  status: "status",
  created: "created_at",
};

export const mileageColumnMap: Record<string, string> = {
  date: "date",
  purpose: "purpose",
  miles: "miles",
  rate: "rate_per_mile",
  deduction: "total_deduction",
  created: "created_at",
};

export const templateColumnMap: Record<string, string> = {
  name: "name",
  description: "description",
  rate: "rate",
  quantity: "quantity",
  created: "created_at",
};
