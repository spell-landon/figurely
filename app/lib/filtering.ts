/**
 * Filtering utilities for table data
 * Handles URL-based filter state and Supabase query building
 */

import { formatInTimeZone } from "date-fns-tz";
import { subDays, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";

export interface DateRangeFilter {
  from: string | null;
  to: string | null;
}

export interface FilterParams {
  status?: string[];
  category?: string[];
  dateRange?: DateRangeFilter;
  search?: string;
}

/**
 * Parse filter parameters from URL search params
 * @param searchParams - URL search params
 * @returns Parsed filter parameters
 */
export function parseFilterParams(searchParams: URLSearchParams): FilterParams {
  const filters: FilterParams = {};

  // Parse status filter (comma-separated values)
  const statusParam = searchParams.get("status");
  if (statusParam) {
    filters.status = statusParam.split(",").filter(Boolean);
  }

  // Parse category filter (comma-separated values)
  const categoryParam = searchParams.get("category");
  if (categoryParam) {
    filters.category = categoryParam.split(",").filter(Boolean);
  }

  // Parse date range
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const datePreset = searchParams.get("date_preset");

  if (datePreset) {
    filters.dateRange = getDateRangeFromPreset(datePreset);
  } else if (dateFrom || dateTo) {
    filters.dateRange = {
      from: dateFrom,
      to: dateTo,
    };
  }

  // Parse search query
  const search = searchParams.get("q");
  if (search) {
    filters.search = search;
  }

  return filters;
}

/**
 * Date range presets
 */
export type DatePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year";

export const datePresetLabels: Record<DatePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last_7_days: "Last 7 Days",
  last_30_days: "Last 30 Days",
  last_90_days: "Last 90 Days",
  this_month: "This Month",
  last_month: "Last Month",
  this_quarter: "This Quarter",
  last_quarter: "Last Quarter",
  this_year: "This Year",
  last_year: "Last Year",
};

/**
 * Get date range from a preset value
 * @param preset - Preset identifier
 * @returns Date range filter
 */
export function getDateRangeFromPreset(preset: string): DateRangeFilter {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const format = "yyyy-MM-dd";

  switch (preset as DatePreset) {
    case "today":
      return {
        from: formatInTimeZone(now, timezone, format),
        to: formatInTimeZone(now, timezone, format),
      };

    case "yesterday": {
      const yesterday = subDays(now, 1);
      return {
        from: formatInTimeZone(yesterday, timezone, format),
        to: formatInTimeZone(yesterday, timezone, format),
      };
    }

    case "last_7_days":
      return {
        from: formatInTimeZone(subDays(now, 7), timezone, format),
        to: formatInTimeZone(now, timezone, format),
      };

    case "last_30_days":
      return {
        from: formatInTimeZone(subDays(now, 30), timezone, format),
        to: formatInTimeZone(now, timezone, format),
      };

    case "last_90_days":
      return {
        from: formatInTimeZone(subDays(now, 90), timezone, format),
        to: formatInTimeZone(now, timezone, format),
      };

    case "this_month":
      return {
        from: formatInTimeZone(startOfMonth(now), timezone, format),
        to: formatInTimeZone(endOfMonth(now), timezone, format),
      };

    case "last_month": {
      const lastMonth = subMonths(now, 1);
      return {
        from: formatInTimeZone(startOfMonth(lastMonth), timezone, format),
        to: formatInTimeZone(endOfMonth(lastMonth), timezone, format),
      };
    }

    case "this_quarter":
      return {
        from: formatInTimeZone(startOfQuarter(now), timezone, format),
        to: formatInTimeZone(endOfQuarter(now), timezone, format),
      };

    case "last_quarter": {
      const lastQuarter = subMonths(now, 3);
      return {
        from: formatInTimeZone(startOfQuarter(lastQuarter), timezone, format),
        to: formatInTimeZone(endOfQuarter(lastQuarter), timezone, format),
      };
    }

    case "this_year":
      return {
        from: formatInTimeZone(startOfYear(now), timezone, format),
        to: formatInTimeZone(endOfYear(now), timezone, format),
      };

    case "last_year": {
      const lastYear = subMonths(now, 12);
      return {
        from: formatInTimeZone(startOfYear(lastYear), timezone, format),
        to: formatInTimeZone(endOfYear(lastYear), timezone, format),
      };
    }

    default:
      return { from: null, to: null };
  }
}

/**
 * Apply filters to a Supabase query
 * @param query - Supabase query builder
 * @param filters - Filter parameters
 * @param options - Configuration options
 * @returns Query with filters applied
 */
export function applySupabaseFilters(
  query: any,
  filters: FilterParams,
  options: {
    statusColumn?: string;
    categoryColumn?: string;
    dateColumn?: string;
  } = {}
): any {
  const {
    statusColumn = "status",
    categoryColumn = "category",
    dateColumn = "date",
  } = options;

  // Apply status filter
  if (filters.status && filters.status.length > 0) {
    query = query.in(statusColumn, filters.status);
  }

  // Apply category filter
  if (filters.category && filters.category.length > 0) {
    query = query.in(categoryColumn, filters.category);
  }

  // Apply date range filter
  if (filters.dateRange) {
    if (filters.dateRange.from) {
      query = query.gte(dateColumn, filters.dateRange.from);
    }
    if (filters.dateRange.to) {
      query = query.lte(dateColumn, filters.dateRange.to);
    }
  }

  return query;
}

/**
 * Build a URL with updated filter parameters
 * @param currentParams - Current URL search params
 * @param filterKey - Filter key to update
 * @param filterValue - New filter value (array or string)
 * @returns Updated search params string
 */
export function buildFilterUrl(
  currentParams: URLSearchParams,
  filterKey: string,
  filterValue: string | string[] | null
): string {
  const params = new URLSearchParams(currentParams);

  if (filterValue === null || (Array.isArray(filterValue) && filterValue.length === 0)) {
    // Remove filter
    params.delete(filterKey);
  } else if (Array.isArray(filterValue)) {
    // Set as comma-separated values
    params.set(filterKey, filterValue.join(","));
  } else {
    // Set single value
    params.set(filterKey, filterValue);
  }

  // Reset to page 1 when changing filters
  params.set("page", "1");

  return `?${params.toString()}`;
}

/**
 * Toggle a value in a multi-select filter
 * @param currentValues - Currently selected values
 * @param value - Value to toggle
 * @returns Updated array of values
 */
export function toggleFilterValue(currentValues: string[], value: string): string[] {
  if (currentValues.includes(value)) {
    return currentValues.filter((v) => v !== value);
  }
  return [...currentValues, value];
}

/**
 * Clear all filters from URL params
 * @param currentParams - Current URL search params
 * @param preserveKeys - Keys to preserve (e.g., 'page', 'limit')
 * @returns Updated search params string
 */
export function clearAllFilters(
  currentParams: URLSearchParams,
  preserveKeys: string[] = ["limit"]
): string {
  const params = new URLSearchParams();

  // Preserve specified keys
  preserveKeys.forEach((key) => {
    const value = currentParams.get(key);
    if (value) {
      params.set(key, value);
    }
  });

  // Reset to page 1
  params.set("page", "1");

  return `?${params.toString()}`;
}

/**
 * Get active filter count for UI badges
 * @param filters - Current filter parameters
 * @returns Number of active filters
 */
export function getActiveFilterCount(filters: FilterParams): number {
  let count = 0;

  if (filters.status && filters.status.length > 0) count++;
  if (filters.category && filters.category.length > 0) count++;
  if (filters.dateRange && (filters.dateRange.from || filters.dateRange.to)) count++;
  if (filters.search) count++;

  return count;
}
