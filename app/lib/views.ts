/**
 * Saved views utilities
 * Handles encoding/decoding view state and database operations
 */

import type { FilterParams } from "./filtering";
import type { SortParams } from "./sorting";

export interface ViewState {
  filters: FilterParams;
  sort: SortParams;
}

export interface SavedView {
  id: string;
  user_id: string;
  name: string;
  table_name: string;
  view_state: ViewState;
  created_at: string;
  updated_at?: string;
}

/**
 * Encode view state to a JSON string for storage
 * @param state - View state to encode
 * @returns JSON string
 */
export function encodeViewState(state: ViewState): string {
  return JSON.stringify(state);
}

/**
 * Decode view state from JSON string
 * @param encoded - JSON string
 * @returns View state
 */
export function decodeViewState(encoded: string): ViewState {
  try {
    return JSON.parse(encoded);
  } catch {
    return {
      filters: {},
      sort: { sortBy: null, sortOrder: "desc" },
    };
  }
}

/**
 * Build URL from view state
 * @param state - View state
 * @param baseParams - Base URL params to preserve
 * @returns URL search string
 */
export function buildUrlFromViewState(
  state: ViewState,
  baseParams?: URLSearchParams
): string {
  const params = new URLSearchParams(baseParams);

  // Apply sort params
  if (state.sort.sortBy) {
    params.set("sort", state.sort.sortBy);
    params.set("order", state.sort.sortOrder);
  }

  // Apply filter params
  if (state.filters.status && state.filters.status.length > 0) {
    params.set("status", state.filters.status.join(","));
  }

  if (state.filters.category && state.filters.category.length > 0) {
    params.set("category", state.filters.category.join(","));
  }

  if (state.filters.dateRange) {
    if (state.filters.dateRange.from) {
      params.set("date_from", state.filters.dateRange.from);
    }
    if (state.filters.dateRange.to) {
      params.set("date_to", state.filters.dateRange.to);
    }
  }

  if (state.filters.search) {
    params.set("q", state.filters.search);
  }

  // Reset to page 1 when loading a view
  params.set("page", "1");

  return `?${params.toString()}`;
}

/**
 * Extract view state from current URL params
 * @param searchParams - URL search params
 * @param currentSort - Current sort params
 * @param currentFilters - Current filter params
 * @returns View state
 */
export function extractViewState(
  currentSort: SortParams,
  currentFilters: FilterParams
): ViewState {
  return {
    sort: currentSort,
    filters: currentFilters,
  };
}

/**
 * Validate view name
 * @param name - View name to validate
 * @returns Error message or null if valid
 */
export function validateViewName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return "View name cannot be empty";
  }

  if (name.length > 50) {
    return "View name must be 50 characters or less";
  }

  return null;
}

/**
 * Get a user-friendly description of a view's filters
 * @param state - View state
 * @returns Human-readable description
 */
export function getViewDescription(state: ViewState): string {
  const parts: string[] = [];

  // Sort description
  if (state.sort.sortBy) {
    const order = state.sort.sortOrder === "asc" ? "ascending" : "descending";
    parts.push(`Sorted by ${state.sort.sortBy} (${order})`);
  }

  // Status filter
  if (state.filters.status && state.filters.status.length > 0) {
    parts.push(`Status: ${state.filters.status.join(", ")}`);
  }

  // Category filter
  if (state.filters.category && state.filters.category.length > 0) {
    parts.push(`Category: ${state.filters.category.join(", ")}`);
  }

  // Date range
  if (state.filters.dateRange) {
    const { from, to } = state.filters.dateRange;
    if (from && to) {
      parts.push(`Date: ${from} to ${to}`);
    } else if (from) {
      parts.push(`Date: from ${from}`);
    } else if (to) {
      parts.push(`Date: until ${to}`);
    }
  }

  // Search
  if (state.filters.search) {
    parts.push(`Search: "${state.filters.search}"`);
  }

  return parts.length > 0 ? parts.join(" • ") : "No filters applied";
}
